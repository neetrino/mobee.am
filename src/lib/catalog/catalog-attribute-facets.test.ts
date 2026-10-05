import { describe, expect, it } from "vitest";
import {
  aggregateAttributeFacetEntries,
  collectAttributeFacetEntries,
  parseAttributeFacetEntries,
} from "./catalog-attribute-facets";

describe("collectAttributeFacetEntries", () => {
  it("dedupes per product case-insensitively and skips color/size", () => {
    const entries = collectAttributeFacetEntries(
      [
        {
          options: [
            { attributeKey: "storage", value: "256GB" },
            { attributeKey: "color", value: "Black" },
            { attributeKey: "size", value: "M" },
          ],
          attributes: { storage: "256gb", sim: ["Dual", { value: "eSIM" }] },
        },
        { options: [{ attributeKey: "Storage", value: "512GB" }] },
      ],
      "en",
    );
    expect(entries).toEqual([
      ["storage", "256GB"],
      ["storage", "512GB"],
      ["sim", "Dual"],
      ["sim", "eSIM"],
    ]);
  });

  it("skips import bookkeeping keys", () => {
    const entries = collectAttributeFacetEntries(
      [{ attributes: { ram: "8GB", source_sku: "SM-123", model_code: "A2890" } }],
      "en",
    );
    expect(entries).toEqual([["ram", "8GB"]]);
  });

  it("uses the locale translation label of attribute values", () => {
    const entries = collectAttributeFacetEntries(
      [
        {
          options: [
            {
              attributeValue: {
                value: "dual",
                attribute: { key: "sim" },
                translations: [
                  { locale: "en", label: "Dual SIM" },
                  { locale: "hy", label: "Երկու SIM" },
                ],
              },
            },
          ],
        },
      ],
      "hy",
    );
    expect(entries).toEqual([["sim", "Երկու SIM"]]);
  });
});

describe("parseAttributeFacetEntries", () => {
  it("returns null for non-projected rows and drops malformed items", () => {
    expect(parseAttributeFacetEntries(null)).toBeNull();
    expect(parseAttributeFacetEntries([["ram", "8GB"], ["bad"], [1, 2], "x"])).toEqual([
      ["ram", "8GB"],
    ]);
  });
});

describe("aggregateAttributeFacetEntries", () => {
  it("counts products per value and orders by meta position", () => {
    const facets = aggregateAttributeFacetEntries(
      [
        [["sim_type", "dual"], ["ram", "8GB"]],
        [["sim_type", "Dual"]],
      ],
      new Map([["ram", { key: "ram", name: "RAM", position: 1, filterable: true }]]),
    );
    expect(facets).toEqual([
      { key: "ram", name: "RAM", position: 1, values: [{ value: "8GB", label: "8GB", count: 1 }] },
      {
        key: "sim_type",
        name: "Sim Type",
        position: Number.MAX_SAFE_INTEGER,
        values: [{ value: "dual", label: "Dual", count: 2 }],
      },
    ]);
  });
});
