import { describe, expect, it } from "vitest";
import { buildBrandWhere, productMatchesBrandTokens, resolveBrandIds } from "./brand-where";

describe("productMatchesBrandTokens", () => {
  const apple = {
    brandId: "brand_1",
    brand: {
      id: "brand_1",
      slug: "apple",
      translations: [{ name: "Apple" }, { name: "Էփլ" }],
    },
  };

  it("matches database id, slug, and localized name", () => {
    expect(productMatchesBrandTokens(apple, ["brand_1"])).toBe(true);
    expect(productMatchesBrandTokens(apple, ["apple"])).toBe(true);
    expect(productMatchesBrandTokens(apple, ["APPLE"])).toBe(true);
    expect(productMatchesBrandTokens(apple, ["էփլ"])).toBe(true);
  });

  it("matches any of multiple brands", () => {
    expect(productMatchesBrandTokens(apple, ["samsung", "apple"])).toBe(true);
    expect(productMatchesBrandTokens(apple, ["samsung"])).toBe(false);
  });
});

describe("resolveBrandIds", () => {
  it("resolves id, slug, and localized name tokens", async () => {
    const result = await resolveBrandIds(["apple", "brand_2"], {
      findMany: async () => [{ id: "brand_1" }, { id: "brand_2" }],
    });
    expect(result).toEqual({ status: "ids", ids: ["brand_1", "brand_2"] });
  });

  it("returns empty when no brand matches", async () => {
    const result = await resolveBrandIds(["missing"], {
      findMany: async () => [],
    });
    expect(result).toEqual({ status: "empty" });
    expect(buildBrandWhere(result)).toEqual({ id: { in: [] } });
  });
});
