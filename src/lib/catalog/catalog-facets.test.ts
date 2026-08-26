import { describe, expect, it } from "vitest";
import { getCatalogFacets, type CatalogFacetsPort } from "./catalog-facets";
import { selectFacetRows } from "./catalog-facet-match";
import { aggregateBrandFacets, aggregateColorFacets } from "./catalog-facet-aggregate";
import { normalizeCatalogQuery } from "./catalog-query";
import { CatalogQueryError } from "./catalog-query-error";
import type { CatalogLightRow } from "./catalog-light.types";

const discounts = { globalDiscount: 0, categoryDiscounts: {}, brandDiscounts: {} };

function row(input: {
  id: string;
  brandId: string;
  brandName: string;
  color: string;
  price: number;
}): CatalogLightRow {
  return {
    id: input.id,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    brandId: input.brandId,
    brand: {
      id: input.brandId,
      slug: input.brandName.toLowerCase(),
      translations: [{ locale: "en", name: input.brandName }],
    },
    variants: [
      {
        price: input.price,
        priceOnRequest: false,
        options: [
          {
            attributeValue: {
              value: input.color,
              attribute: { key: "color" },
              translations: [{ locale: "en", label: input.color }],
            },
          },
        ],
      },
    ],
  };
}

const rows: CatalogLightRow[] = [
  row({ id: "a1", brandId: "b-apple", brandName: "Apple", color: "Black", price: 100 }),
  row({ id: "a2", brandId: "b-apple", brandName: "Apple", color: "Silver", price: 120 }),
  row({ id: "s1", brandId: "b-samsung", brandName: "Samsung", color: "Black", price: 80 }),
];

describe("facet exclusion", () => {
  it("excludes the current brand filter from brand counts", () => {
    const query = normalizeCatalogQuery({ brand: "b-apple", lang: "en" });
    const brandRows = selectFacetRows(rows, query, discounts, "brand");
    const brands = aggregateBrandFacets(brandRows, "en");
    expect(brands.map((item) => item.id).sort()).toEqual(["b-apple", "b-samsung"]);
  });

  it("excludes the current color filter from color counts", () => {
    const query = normalizeCatalogQuery({ colors: "black", lang: "en" });
    const colorRows = selectFacetRows(rows, query, discounts, "colors");
    const colors = aggregateColorFacets(colorRows, "en");
    expect(colors.map((item) => item.value).sort()).toEqual(["black", "silver"]);
  });

  it("applies other filters when counting brands", () => {
    const query = normalizeCatalogQuery({ colors: "black", lang: "en" });
    const brandRows = selectFacetRows(rows, query, discounts, "brand");
    const brands = aggregateBrandFacets(brandRows, "en");
    expect(brands).toEqual([
      { id: "b-apple", name: "Apple", count: 1 },
      { id: "b-samsung", name: "Samsung", count: 1 },
    ]);
  });
});

describe("getCatalogFacets", () => {
  it("propagates unknown category as a client error", async () => {
    const port: CatalogFacetsPort = {
      buildWhere: async () => {
        throw new CatalogQueryError("Unknown category: ghost");
      },
      fetchLightRows: async () => rows,
      loadDiscounts: async () => discounts,
      loadPriceFilterSettings: async () => ({
        stepSize: null,
        stepSizePerCurrency: null,
      }),
    };
    await expect(
      getCatalogFacets({ category: "phones,ghost", lang: "en" }, port),
    ).rejects.toBeInstanceOf(CatalogQueryError);
  });

  it("applies filter=new|featured|bestseller to the facet candidate set", async () => {
    const seen: string[] = [];
    const port: CatalogFacetsPort = {
      buildWhere: async (query) => {
        seen.push(query.filter ?? "");
        return { where: { published: true }, bestsellerProductIds: [] };
      },
      fetchLightRows: async () => rows,
      loadDiscounts: async () => discounts,
      loadPriceFilterSettings: async () => ({
        stepSize: null,
        stepSizePerCurrency: null,
      }),
    };
    await getCatalogFacets({ filter: "new", lang: "en" }, port);
    await getCatalogFacets({ filter: "featured", lang: "en" }, port);
    await getCatalogFacets({ filter: "bestseller", lang: "en" }, port);
    expect(seen).toEqual(["new", "featured", "bestseller"]);
  });
});

describe("facet filter=new Marco exclusion", () => {
  it("excludes Marco-image products from new-arrival facet counts", () => {
    const marco: CatalogLightRow = {
      ...row({ id: "marco", brandId: "b-apple", brandName: "Apple", color: "Black", price: 50 }),
      media: ["https://cdn.example.com/products/marco/phone.jpg"],
    };
    const query = normalizeCatalogQuery({ filter: "new", lang: "en" });
    const brandRows = selectFacetRows([...rows, marco], query, discounts, "brand");
    expect(brandRows.map((item) => item.id).sort()).toEqual(["a1", "a2", "s1"]);
  });
});
