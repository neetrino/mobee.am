import { describe, expect, it } from "vitest";
import {
  calculateDiscountAmount,
  calculateTotals,
  normalizeCheckoutLocale,
} from "./checkout-calculations";

describe("checkout-calculations", () => {
  it("normalizes locale from supported and regional variants", () => {
    expect(normalizeCheckoutLocale("hy")).toBe("hy");
    expect(normalizeCheckoutLocale("ru-RU")).toBe("ru");
    expect(normalizeCheckoutLocale("en-US")).toBe("en");
    expect(normalizeCheckoutLocale("de")).toBe("en");
  });

  it("calculates discount amount by percent", () => {
    expect(calculateDiscountAmount(10000, 10)).toBe(1000);
    expect(calculateDiscountAmount(10000, 0)).toBe(0);
  });

  it("calculates totals with tax over discounted subtotal", () => {
    const totals = calculateTotals({
      subtotal: 10000,
      discountAmount: 1000,
      shippingAmount: 500,
      taxConfig: { percent: 20, applyOnShipping: false },
    });

    expect(totals.subtotal).toBe(10000);
    expect(totals.discountAmount).toBe(1000);
    expect(totals.shippingAmount).toBe(500);
    expect(totals.taxAmount).toBe(1800);
    expect(totals.total).toBe(11300);
  });
});
