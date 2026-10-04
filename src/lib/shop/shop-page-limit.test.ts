import { describe, expect, it } from "vitest";
import { computeShopPageLimitFromFilterHeight } from "./shop-page-limit";

describe("computeShopPageLimitFromFilterHeight", () => {
  it("uses at least four product rows", () => {
    expect(computeShopPageLimitFromFilterHeight(100, 580, 3)).toBe(12);
  });

  it("sizes the page to cover the filter column height", () => {
    expect(computeShopPageLimitFromFilterHeight(5800, 580, 3)).toBe(30);
  });

  it("caps at the catalog max page size", () => {
    expect(computeShopPageLimitFromFilterHeight(1_000_000, 580, 3)).toBe(200);
  });
});
