import { describe, expect, it } from "vitest";
import { buildSearchWhere } from "./search-where";

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
