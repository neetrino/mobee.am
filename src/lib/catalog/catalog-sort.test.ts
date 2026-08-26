import { describe, expect, it } from "vitest";
import { sortCatalogRows } from "./catalog-sort";
import { selectCatalogPage } from "./select-catalog-page";
import type { CatalogLightRow } from "./catalog-light.types";
import { normalizeCatalogQuery } from "./catalog-query";

const discounts = { globalDiscount: 0, categoryDiscounts: {}, brandDiscounts: {} };

function row(input: {
  id: string;
  title: string;
  price: number;
  createdAt: string;
}): CatalogLightRow {
  return {
    id: input.id,
    createdAt: new Date(input.createdAt),
    translations: [{ locale: "en", title: input.title }],
    variants: [{ price: input.price, priceOnRequest: false }],
  };
}

describe("sortCatalogRows stability", () => {
  it("places products without a display price last for price-asc and price-desc", () => {
    const rows = [
      row({ id: "priced-low", title: "Low", price: 10, createdAt: "2026-01-01T00:00:00.000Z" }),
      {
        ...row({ id: "on-request", title: "Ask", price: 0, createdAt: "2026-01-03T00:00:00.000Z" }),
        variants: [{ price: 0, priceOnRequest: true }],
      },
      row({ id: "priced-high", title: "High", price: 90, createdAt: "2026-01-02T00:00:00.000Z" }),
      {
        ...row({ id: "zero", title: "Zero", price: 0, createdAt: "2026-01-04T00:00:00.000Z" }),
        variants: [{ price: 0, priceOnRequest: false }],
      },
    ];
    expect(sortCatalogRows(rows, "price-asc", "en", discounts, []).map((item) => item.id)).toEqual([
      "priced-low",
      "priced-high",
      "zero",
      "on-request",
    ]);
    expect(sortCatalogRows(rows, "price-desc", "en", discounts, []).map((item) => item.id)).toEqual([
      "priced-high",
      "priced-low",
      "zero",
      "on-request",
    ]);
  });

  it("keeps a stable order for two products without a price", () => {
    const rows = [
      {
        ...row({ id: "b", title: "B", price: 0, createdAt: "2026-01-01T00:00:00.000Z" }),
        variants: [{ price: 0, priceOnRequest: true }],
      },
      {
        ...row({ id: "a", title: "A", price: 0, createdAt: "2026-01-01T00:00:00.000Z" }),
        variants: [{ price: 0, priceOnRequest: true }],
      },
    ];
    expect(sortCatalogRows(rows, "price-desc", "en", discounts, []).map((item) => item.id)).toEqual([
      "a",
      "b",
    ]);
    expect(sortCatalogRows(rows, "price-asc", "en", discounts, []).map((item) => item.id)).toEqual([
      "a",
      "b",
    ]);
  });
  it("breaks price ties by createdAt then id", () => {
    const rows = [
      row({ id: "b", title: "B", price: 100, createdAt: "2026-01-01T00:00:00.000Z" }),
      row({ id: "a", title: "A", price: 100, createdAt: "2026-01-01T00:00:00.000Z" }),
      row({ id: "c", title: "C", price: 100, createdAt: "2026-01-02T00:00:00.000Z" }),
    ];
    const sorted = sortCatalogRows(rows, "price-asc", "en", discounts, []);
    expect(sorted.map((item) => item.id)).toEqual(["c", "a", "b"]);
  });

  it("uses locale fallback for name sort", () => {
    const rows = [
      {
        ...row({ id: "2", title: "", price: 10, createdAt: "2026-01-01T00:00:00.000Z" }),
        translations: [
          { locale: "hy", title: "Բետա" },
          { locale: "en", title: "" },
        ],
      },
      {
        ...row({ id: "1", title: "", price: 10, createdAt: "2026-01-01T00:00:00.000Z" }),
        translations: [{ locale: "hy", title: "Ալֆա" }],
      },
    ];
    const sorted = sortCatalogRows(rows, "name-asc", "en", discounts, []);
    expect(sorted.map((item) => item.id)).toEqual(["1", "2"]);
  });
});

describe("selectCatalogPage", () => {
  it("returns exact total and distinct page ids", () => {
    const rows = Array.from({ length: 25 }, (_, index) =>
      row({
        id: `p${String(index).padStart(2, "0")}`,
        title: `P${index}`,
        price: 10 + index,
        createdAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
      }),
    );
    const page1 = selectCatalogPage(
      rows,
      normalizeCatalogQuery({ page: 1, limit: 12, sort: "default" }),
      discounts,
      [],
    );
    const page2 = selectCatalogPage(
      rows,
      normalizeCatalogQuery({ page: 2, limit: 12, sort: "default" }),
      discounts,
      [],
    );
    expect(page1.total).toBe(25);
    expect(page2.total).toBe(25);
    expect(page1.ids).toHaveLength(12);
    expect(page2.ids).toHaveLength(12);
    expect(page1.ids.some((id) => page2.ids.includes(id))).toBe(false);
  });

  it("returns empty ids for an out-of-range page with a stable total", () => {
    const rows = [
      row({ id: "a", title: "A", price: 10, createdAt: "2026-01-01T00:00:00.000Z" }),
    ];
    const page = selectCatalogPage(
      rows,
      normalizeCatalogQuery({ page: 9, limit: 12 }),
      discounts,
      [],
    );
    expect(page.ids).toEqual([]);
    expect(page.total).toBe(1);
  });

  it("applies price filters to ids and preserves request order", () => {
    const rows = [
      row({ id: "c", title: "C", price: 30, createdAt: "2026-01-01T00:00:00.000Z" }),
      row({ id: "a", title: "A", price: 10, createdAt: "2026-01-01T00:00:00.000Z" }),
      row({ id: "b", title: "B", price: 20, createdAt: "2026-01-01T00:00:00.000Z" }),
    ];
    const page = selectCatalogPage(
      rows,
      normalizeCatalogQuery({
        ids: ["c", "b", "a"],
        maxPrice: 25,
        page: 1,
        limit: 12,
      }),
      discounts,
      [],
    );
    expect(page.ids).toEqual(["b", "a"]);
    expect(page.total).toBe(2);
  });
});
