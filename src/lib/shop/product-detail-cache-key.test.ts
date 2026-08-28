import { describe, expect, it } from "vitest";
import {
  buildProductDetailCacheKey,
  PRODUCT_DETAIL_HTTP_CACHE_CONTROL,
} from "./product-detail-cache-key";

describe("buildProductDetailCacheKey", () => {
  it("includes lang so translated PDP payloads do not collide", () => {
    const hy = buildProductDetailCacheKey("iphone", "hy");
    const ru = buildProductDetailCacheKey("iphone", "ru");
    expect(hy).not.toBe(ru);
    expect(hy).toContain(":hy");
    expect(ru).toContain(":ru");
  });
});

describe("PRODUCT_DETAIL_HTTP_CACHE_CONTROL", () => {
  it("forbids CDN storage of live PDP JSON", () => {
    expect(PRODUCT_DETAIL_HTTP_CACHE_CONTROL).toContain("no-store");
    expect(PRODUCT_DETAIL_HTTP_CACHE_CONTROL).not.toContain("s-maxage");
  });
});
