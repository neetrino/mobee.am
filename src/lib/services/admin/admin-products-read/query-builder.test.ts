import { describe, expect, it } from "vitest";
import { buildProductWhereClause } from "./query-builder";

describe("buildProductWhereClause stock filtering", () => {
  it("adds in-stock predicate to AND clauses", () => {
    const where = buildProductWhereClause({ stockStatus: "inStock" });

    expect(where.AND).toEqual([{ variants: { some: { stock: { gt: 0 } } } }]);
  });

  it("adds out-of-stock predicate to AND clauses", () => {
    const where = buildProductWhereClause({ stockStatus: "outOfStock" });

    expect(where.AND).toEqual([{ variants: { none: { stock: { gt: 0 } } } }]);
  });
});
