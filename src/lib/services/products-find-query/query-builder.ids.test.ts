import { describe, expect, it } from "vitest";
import { buildWhereClause } from "./query-builder";

describe("buildWhereClause ids constraint", () => {
  it("keeps ids as a constraint and still applies published/deleted conditions", async () => {
    const result = await buildWhereClause({
      ids: ["prod-1", "prod-2"],
      lang: "en",
      page: 1,
      limit: 10,
    });
    expect(result.where).toEqual({
      AND: [
        { published: true, deletedAt: null },
        { id: { in: ["prod-1", "prod-2"] } },
      ],
    });
    expect(result.bestsellerProductIds).toEqual([]);
  });
});
