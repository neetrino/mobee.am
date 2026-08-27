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

  it('includes lang so translated lists do not share a cache entry', () => {
    const hy = buildProductListCacheKey({ lang: 'hy', page: 1, limit: 12 });
    const ru = buildProductListCacheKey({ lang: 'ru', page: 1, limit: 12 });
    expect(hy).not.toBe(ru);
    expect(hy).toContain('lang=hy');
    expect(ru).toContain('lang=ru');
  });
});
