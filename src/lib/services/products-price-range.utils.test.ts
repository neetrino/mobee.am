import { describe, expect, it } from "vitest";
import { computePriceBoundsFromProductRows } from "@/lib/services/products-price-range.utils";

describe("computePriceBoundsFromProductRows", () => {
  const discounts = {
    globalDiscount: 0,
    categoryDiscounts: {},
    brandDiscounts: {},
  };

  it("uses effective discounted variant prices", () => {
    const bounds = computePriceBoundsFromProductRows(
      [
        {
          discountPercent: 10,
          primaryCategoryId: null,
          brandId: null,
          variants: [{ price: 100 }, { price: 200 }],
        },
      ],
      discounts,
    );
    expect(bounds.hasProducts).toBe(true);
    expect(bounds.min).toBe(90);
    expect(bounds.max).toBe(180);
  });

  it("returns hasProducts false for empty input", () => {
    const bounds = computePriceBoundsFromProductRows([], discounts);
    expect(bounds).toEqual({ min: 0, max: 0, hasProducts: false });
  });

  it("does not floor small minimum prices to zero", () => {
    const bounds = computePriceBoundsFromProductRows(
      [
        {
          discountPercent: null,
          primaryCategoryId: null,
          brandId: null,
          variants: [{ price: 30 }, { price: 62.5 }],
        },
      ],
      discounts,
    );
    expect(bounds.min).toBe(30);
    expect(bounds.max).toBe(62.5);
  });
});
