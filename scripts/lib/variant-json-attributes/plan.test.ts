import { describe, expect, it } from "vitest";
import { VARIANT_JSON_ATTRIBUTE_DEFINITIONS } from "./definitions";
import { buildBackfillPlan } from "./plan";

describe("buildBackfillPlan", () => {
  it("canonicalizes RAM values and plans missing options only", () => {
    const plan = buildBackfillPlan(
      [
        {
          id: "v1",
          productId: "p1",
          attributes: { ram: "8 GB RAM", storage: "256GB", source_sku: "X" },
          optionKeys: ["storage"],
        },
        { id: "v2", productId: "p1", attributes: { ram: "8GB", chip: "M4" }, optionKeys: ["chip"] },
      ],
      VARIANT_JSON_ATTRIBUTE_DEFINITIONS,
    );

    expect([...(plan.valuesByKey.get("ram") ?? [])]).toEqual(["8GB"]);
    expect(plan.valuesByKey.has("chip")).toBe(false);
    expect(plan.variants).toEqual([
      {
        variantId: "v1",
        productId: "p1",
        options: [{ key: "ram", value: "8GB" }],
        normalizedAttributes: { ram: "8GB", storage: "256GB", source_sku: "X" },
      },
      { variantId: "v2", productId: "p1", options: [{ key: "ram", value: "8GB" }], normalizedAttributes: null },
    ]);
  });

  it("is a no-op once options exist and values are canonical", () => {
    const plan = buildBackfillPlan(
      [{ id: "v1", productId: "p1", attributes: { ram: "12GB" }, optionKeys: ["ram"] }],
      VARIANT_JSON_ATTRIBUTE_DEFINITIONS,
    );
    expect(plan.variants).toEqual([]);
  });
});
