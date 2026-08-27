import { describe, expect, it } from "vitest";
import { buildProductDetailCacheKey } from "./product-detail-cache-key";

describe("buildProductDetailCacheKey", () => {
  it("includes lang so translated PDP payloads do not collide", () => {
    const hy = buildProductDetailCacheKey("iphone", "hy");
    const ru = buildProductDetailCacheKey("iphone", "ru");
    expect(hy).not.toBe(ru);
    expect(hy).toContain(":hy");
    expect(ru).toContain(":ru");
  });
});
