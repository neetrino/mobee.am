import { describe, expect, it } from "vitest";
import { aggregateQuantitiesByVariantId } from "./aggregate-variant-quantities";

describe("aggregateQuantitiesByVariantId", () => {
  it("aggregates quantities by variant id", () => {
    expect(
      aggregateQuantitiesByVariantId([
        { variantId: "v1", quantity: 2 },
        { variantId: "v2", quantity: 1 },
        { variantId: "v1", quantity: 3 },
      ]),
    ).toEqual([
      { variantId: "v1", quantity: 5 },
      { variantId: "v2", quantity: 1 },
    ]);
  });

  it("returns empty array for empty items", () => {
    expect(aggregateQuantitiesByVariantId([])).toEqual([]);
  });
});
