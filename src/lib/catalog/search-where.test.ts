import { describe, expect, it } from "vitest";
import {
  buildListingRowSearchWhere,
  buildSearchWhere,
  tokenizeSearchQuery,
} from "./search-where";

describe("tokenizeSearchQuery", () => {
  it("splits on whitespace and drops duplicates", () => {
    expect(tokenizeSearchQuery("  samsung   a26 samsung ")).toEqual(["samsung", "a26"]);
  });
});

describe("buildListingRowSearchWhere", () => {
  it("requires every token to match", () => {
    const where = buildListingRowSearchWhere("samsung a26");
    expect(where.AND).toHaveLength(2);
    expect(where.AND).toEqual([
      expect.objectContaining({
        OR: expect.arrayContaining([
          { title: { contains: "samsung", mode: "insensitive" } },
        ]),
      }),
      expect.objectContaining({
        OR: expect.arrayContaining([{ title: { contains: "a26", mode: "insensitive" } }]),
      }),
    ]);
  });
});

describe("buildSearchWhere", () => {
  it("matches SKU only on published variants", () => {
    const where = buildSearchWhere("SKU-1");
    const skuBranch = where.OR?.find(
      (branch) =>
        branch.variants &&
        typeof branch.variants === "object" &&
        "some" in branch.variants,
    );
    expect(skuBranch).toMatchObject({
      variants: {
        some: {
          published: true,
          sku: { contains: "SKU-1", mode: "insensitive" },
        },
      },
    });
  });
});
