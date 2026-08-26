import { describe, expect, it } from "vitest";
import { catalogListingPrice, rowMatchesPriceFilter } from "./catalog-price";
import type { CatalogLightRow } from "./catalog-light.types";

const discounts = {
  globalDiscount: 0,
  categoryDiscounts: {},
  brandDiscounts: { brand_apple: 10 },
};

function row(overrides: Partial<CatalogLightRow>): CatalogLightRow {
  return {
    id: "p1",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    brandId: "brand_apple",
    discountPercent: 0,
    variants: [{ price: 100, priceOnRequest: false }],
    ...overrides,
  };
}

describe("catalog listing price", () => {
  it("uses effective discounted price, not raw variant price", () => {
    expect(catalogListingPrice(row({}), discounts)).toBe(90);
  });

  it("applies product discount before brand discount", () => {
    expect(catalogListingPrice(row({ discountPercent: 20 }), discounts)).toBe(80);
  });

  it("excludes price-on-request and unpublished-price variants", () => {
    const priced = row({
      variants: [
        { price: 0, priceOnRequest: false },
        { price: 200, priceOnRequest: true },
      ],
    });
    expect(catalogListingPrice(priced, discounts)).toBeNull();
  });

  it("filters min/max against the canonical listing price", () => {
    const product = row({});
    expect(rowMatchesPriceFilter(product, discounts, 85, 95)).toBe(true);
    expect(rowMatchesPriceFilter(product, discounts, 91, 200)).toBe(false);
    expect(rowMatchesPriceFilter(product, discounts, 0, 89)).toBe(false);
  });
});
