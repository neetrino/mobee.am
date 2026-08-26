import { describe, expect, it } from "vitest";
import { buildProductListCacheKey } from "./product-list-cache-key";
import { CATALOG_LIST_CACHE_PREFIX } from "@/lib/catalog/catalog.constants";

describe("buildProductListCacheKey", () => {
  it("canonicalizes brand/color/size token order", () => {
    const a = buildProductListCacheKey({
      brand: "apple,samsung",
      colors: "black,silver",
      sizes: "L,M",
      lang: "en",
      page: 1,
      limit: 12,
    });
    const b = buildProductListCacheKey({
      brand: "samsung,apple",
      colors: "silver,black",
      sizes: "M,L",
      lang: "en",
      page: 1,
      limit: 12,
    });
    expect(a).toBe(b);
    expect(a.startsWith(`${CATALOG_LIST_CACHE_PREFIX}:`)).toBe(true);
  });
});
