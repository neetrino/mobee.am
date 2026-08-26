import { describe, expect, it } from "vitest";
import { buildCatalogWhere } from "./build-catalog-where";
import { normalizeCatalogQuery } from "./catalog-query";
import { CatalogQueryError } from "./catalog-query-error";

const skipBrands = async () => ({ status: "skip" as const });

describe("buildCatalogWhere", () => {
  it("keeps ids as a constraint and still applies brand and filter", async () => {
    const result = await buildCatalogWhere(
      normalizeCatalogQuery({
        ids: ["p2", "p1"],
        brand: "apple",
        filter: "featured",
      }),
      {
        resolveBrands: async () => ({ status: "ids", ids: ["brand_apple"] }),
        resolveCategory: async () => null,
        bestsellers: async () => ["best-1"],
      },
    );
    expect(result.where).toMatchObject({
      AND: expect.arrayContaining([
        { published: true, deletedAt: null },
        { id: { in: ["p2", "p1"] } },
        { brandId: { in: ["brand_apple"] } },
        { featured: true },
      ]),
    });
  });

  it("uses the same ranked ids for filter=bestseller as list ranking", async () => {
    const ranked = ["sold-1", "sold-2"];
    const result = await buildCatalogWhere(
      normalizeCatalogQuery({ filter: "bestseller" }),
      {
        resolveBrands: skipBrands,
        resolveCategory: async () => null,
        bestsellers: async () => ranked,
      },
    );
    expect(result.where).toMatchObject({
      AND: expect.arrayContaining([{ id: { in: ranked } }]),
    });
    expect(result.bestsellerProductIds).toEqual(ranked);
  });

  it("throws 400 when any category slug is unknown", async () => {
    await expect(
      buildCatalogWhere(normalizeCatalogQuery({ category: "phones,ghost" }), {
        resolveBrands: skipBrands,
        resolveCategory: async () => null,
        bestsellers: async () => [],
      }),
    ).rejects.toBeInstanceOf(CatalogQueryError);
  });
});
