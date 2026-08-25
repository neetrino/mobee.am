import { describe, expect, it } from "vitest";
import { findCatalogProductPage, type CatalogFindPort } from "./catalog-find";
import { normalizeCatalogQuery } from "./catalog-query";
import { selectCatalogPage } from "./select-catalog-page";
import { variantMatchesColorAndSize } from "./variant-option-where";
import type { CatalogLightRow } from "./catalog-light.types";
import type { ProductWithRelations } from "@/lib/services/products-find-query/types";

const discounts = { globalDiscount: 0, categoryDiscounts: {}, brandDiscounts: {} };
const SAMSUNG_COUNT = 220;
const APPLE_COUNT = 50;
const TOTAL = SAMSUNG_COUNT + APPLE_COUNT;

function dated(index: number): Date {
  return new Date(Date.UTC(2026, 0, 1 + index));
}

function baseRow(input: {
  id: string;
  brandId: string;
  index: number;
  title: string;
  price: number;
  color?: string;
  size?: string;
  discountPercent?: number;
}): CatalogLightRow {
  const options = [];
  if (input.color) {
    options.push({
      attributeValue: {
        value: input.color,
        attribute: { key: "color" },
        translations: [{ locale: "en", label: input.color }],
      },
    });
  }
  if (input.size) {
    options.push({
      attributeValue: {
        value: input.size,
        attribute: { key: "size" },
        translations: [{ locale: "en", label: input.size }],
      },
    });
  }
  return {
    id: input.id,
    createdAt: dated(input.index),
    brandId: input.brandId,
    discountPercent: input.discountPercent ?? 0,
    brand: {
      id: input.brandId,
      slug: input.brandId === "brand_apple" ? "apple" : "samsung",
      translations: [
        { locale: "en", name: input.brandId === "brand_apple" ? "Apple" : "Samsung" },
      ],
    },
    translations: [{ locale: "en", title: input.title }],
    variants: [
      {
        price: input.price,
        priceOnRequest: false,
        options,
      },
    ],
  };
}

function catalogDataset(): CatalogLightRow[] {
  const samsung = Array.from({ length: SAMSUNG_COUNT }, (_, index) =>
    baseRow({
      id: `samsung-${index}`,
      brandId: "brand_samsung",
      index: TOTAL - index,
      title: `Samsung ${index}`,
      price: 100,
      color: "Black",
      size: "M",
    }),
  );
  const apple = Array.from({ length: APPLE_COUNT }, (_, index) =>
    baseRow({
      id: `apple-${index}`,
      brandId: "brand_apple",
      index: APPLE_COUNT - index,
      title: `Apple ${index}`,
      price: index === 0 ? 250 : 180,
      color: index < 3 ? "Space Black" : "Silver",
      size: "M",
      discountPercent: index === 0 ? 20 : 0,
    }),
  );
  const unpublished = baseRow({
    id: "hidden",
    brandId: "brand_apple",
    index: 999,
    title: "Hidden Apple",
    price: 10,
  });
  const noPrice = baseRow({
    id: "apple-noprice",
    brandId: "brand_apple",
    index: 0,
    title: "Apple inquiry",
    price: 0,
  });
  noPrice.variants = [{ price: 0, priceOnRequest: true, options: [] }];
  return [...samsung, ...apple, unpublished, noPrice];
}

function brandIdsFromWhere(where: unknown): string[] | null {
  if (!where || typeof where !== "object") return null;
  const record = where as Record<string, unknown>;
  if (
    record.brandId &&
    typeof record.brandId === "object" &&
    record.brandId !== null &&
    "in" in record.brandId
  ) {
    return (record.brandId as { in: string[] }).in;
  }
  if (Array.isArray(record.AND)) {
    for (const part of record.AND) {
      const nested = brandIdsFromWhere(part);
      if (nested) return nested;
    }
  }
  return null;
}

describe("catalog dataset harness (>250 products)", () => {
  const dataset = catalogDataset().filter((row) => row.id !== "hidden");

  it("keeps Apple after the first 200 newest rows and still returns all Apple products", () => {
    const newest = [...dataset].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
    const window200 = newest.slice(0, 200);
    expect(window200.some((row) => row.brandId === "brand_apple")).toBe(false);

    const apples = dataset.filter((row) => row.brandId === "brand_apple");
    const page = selectCatalogPage(
      apples,
      normalizeCatalogQuery({ brand: "apple", page: 1, limit: 12 }),
      discounts,
      [],
    );
    expect(page.total).toBe(APPLE_COUNT + 1);
    expect(page.ids.every((id) => id.startsWith("apple"))).toBe(true);
  });

  it("paginates Apple with a stable order and exact total", () => {
    const apples = dataset.filter((row) => row.brandId === "brand_apple");
    const page1 = selectCatalogPage(
      apples,
      normalizeCatalogQuery({ brand: "apple", page: 1, limit: 12, sort: "default" }),
      discounts,
      [],
    );
    const page2 = selectCatalogPage(
      apples,
      normalizeCatalogQuery({ brand: "apple", page: 2, limit: 12, sort: "default" }),
      discounts,
      [],
    );
    expect(page1.total).toBe(page2.total);
    expect(page1.ids).not.toEqual(page2.ids);
    expect(
      selectCatalogPage(
        apples,
        normalizeCatalogQuery({ brand: "apple", page: 1, limit: 12, sort: "default" }),
        discounts,
        [],
      ).ids,
    ).toEqual(page1.ids);
  });

  it("matches color + size on the same variant only", () => {
    const split = baseRow({
      id: "split",
      brandId: "brand_apple",
      index: 1,
      title: "Split",
      price: 10,
    });
    split.variants = [
      {
        price: 10,
        options: [
          {
            attributeValue: {
              value: "Space Black",
              attribute: { key: "color" },
              translations: [{ locale: "en", label: "Space Black" }],
            },
          },
        ],
      },
      {
        price: 10,
        options: [
          {
            attributeValue: {
              value: "M",
              attribute: { key: "size" },
              translations: [{ locale: "en", label: "M" }],
            },
          },
        ],
      },
    ];
    const same = dataset.find((row) => row.id === "apple-0");
    expect(same).toBeDefined();
    expect(
      variantMatchesColorAndSize(same?.variants[0]?.options, ["space black"], ["M"], "en"),
    ).toBe(true);
    expect(
      split.variants.some((variant) =>
        variantMatchesColorAndSize(variant.options, ["space black"], ["M"], "en"),
      ),
    ).toBe(false);
  });

  it("finds Apple products through the injected catalog port without a 200 cap", async () => {
    const port: CatalogFindPort = {
      buildWhere: async () => ({
        where: { brandId: { in: ["brand_apple"] } },
        bestsellerProductIds: [],
      }),
      fetchLightRows: async (where) => {
        const brandIds = brandIdsFromWhere(where) ?? [];
        return dataset.filter((row) => brandIds.includes(row.brandId ?? ""));
      },
      loadPageProducts: async (ids) =>
        ids.map((id) => ({ id }) as ProductWithRelations),
      loadDiscounts: async () => discounts,
    };

    const result = await findCatalogProductPage(
      { brand: "apple", page: 1, limit: 12 },
      port,
    );
    expect(result.total).toBe(APPLE_COUNT + 1);
    expect(result.products).toHaveLength(12);
    expect(result.products.every((product) => product.id.startsWith("apple"))).toBe(true);
  });

  it("keeps search/category candidate totals above the old 200 window", () => {
    const page = selectCatalogPage(
      dataset,
      normalizeCatalogQuery({ search: "a", page: 1, limit: 12 }),
      discounts,
      [],
    );
    expect(page.total).toBeGreaterThan(200);
    expect(page.ids).toHaveLength(12);
  });

  it("runs ids through the light-row pipeline instead of skipping filters", async () => {
    let fetched = false;
    const port: CatalogFindPort = {
      buildWhere: async () => ({
        where: { id: { in: ["apple-1", "samsung-1"] } },
        bestsellerProductIds: [],
      }),
      fetchLightRows: async () => {
        fetched = true;
        return dataset.filter((row) => row.id === "apple-1" || row.id === "samsung-1");
      },
      loadPageProducts: async (ids) =>
        ids.map((id) => ({ id }) as ProductWithRelations),
      loadDiscounts: async () => discounts,
    };
    const result = await findCatalogProductPage(
      { ids: ["samsung-1", "apple-1"], page: 1, limit: 12 },
      port,
    );
    expect(fetched).toBe(true);
    expect(result.products.map((product) => product.id)).toEqual(["samsung-1", "apple-1"]);
  });
});
