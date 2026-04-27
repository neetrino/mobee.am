import { describe, expect, it } from "vitest";
import {
  buildProductListFiltersFromUrlSearchParams,
  buildShopProductFiltersFromSearchParams,
} from "./build-shop-product-filters";

describe("buildShopProductFiltersFromSearchParams", () => {
  it("maps search params and caps limit at 200", () => {
    const f = buildShopProductFiltersFromSearchParams(
      { page: "2", limit: "500", category: "phones", sort: "name-asc" },
      "hy",
    );
    expect(f.page).toBe(2);
    expect(f.limit).toBe(200);
    expect(f.category).toBe("phones");
    expect(f.sort).toBe("name-asc");
    expect(f.lang).toBe("hy");
  });

  it("defaults page to 1 when invalid", () => {
    const f = buildShopProductFiltersFromSearchParams({ page: "0" }, "en");
    expect(f.page).toBe(1);
  });
});

describe("buildProductListFiltersFromUrlSearchParams", () => {
  it("parses ids and bumps limit when below id count", () => {
    const sp = new URLSearchParams();
    sp.set("ids", "a,b,c");
    sp.set("limit", "1");
    sp.set("lang", "en");
    const f = buildProductListFiltersFromUrlSearchParams(sp);
    expect(f.ids).toEqual(["a", "b", "c"]);
    expect(f.limit).toBe(3);
  });

  it("caps ids at 20", () => {
    const ids = Array.from({ length: 25 }, (_, i) => `p${i}`).join(",");
    const sp = new URLSearchParams();
    sp.set("ids", ids);
    const f = buildProductListFiltersFromUrlSearchParams(sp);
    expect(f.ids?.length).toBe(20);
  });
});
