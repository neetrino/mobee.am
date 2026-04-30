import { describe, expect, it } from "vitest";
import { buildWhereClause } from "./query-builder";

describe("buildWhereClause ids shortcut", () => {
  it("returns id-in filter and skips category work", async () => {
    const result = await buildWhereClause({
      ids: ["prod-1", "prod-2"],
      lang: "en",
      page: 1,
      limit: 10,
    });
    expect(result.where).toEqual({
      published: true,
      deletedAt: null,
      id: { in: ["prod-1", "prod-2"] },
    });
    expect(result.bestsellerProductIds).toEqual([]);
  });
});
