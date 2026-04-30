import { describe, expect, it } from "vitest";
import { productFiltersToApiParams } from "./product-filters-to-api-params";

describe("productFiltersToApiParams", () => {
  it("maps filters to API query strings", () => {
    const p = productFiltersToApiParams({
      lang: "hy",
      page: 2,
      limit: 12,
      category: "phones",
      sort: "price-asc",
    });
    expect(p.lang).toBe("hy");
    expect(p.page).toBe("2");
    expect(p.category).toBe("phones");
    expect(p.sort).toBe("price-asc");
  });

  it("omits default sort from params", () => {
    const p = productFiltersToApiParams({
      lang: "en",
      page: 1,
      limit: 12,
      sort: "default",
    });
    expect(p.sort).toBeUndefined();
  });
});
