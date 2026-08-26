import { describe, expect, it } from "vitest";
import {
  aggregateColorFacets,
  aggregateSizeFacets,
} from "./catalog-facet-aggregate";
import type { CatalogLightRow } from "./catalog-light.types";

function colorOption(value: string) {
  return {
    attributeValue: {
      value,
      attribute: { key: "color" },
      translations: [{ locale: "en", label: value }],
    },
  };
}

function sizeOption(value: string) {
  return {
    attributeValue: {
      value,
      attribute: { key: "size" },
      translations: [{ locale: "en", label: value }],
    },
  };
}

describe("aggregateColorFacets product counts", () => {
  it("counts one product with three Black variants as Black=1", () => {
    const row: CatalogLightRow = {
      id: "p1",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      variants: [
        { price: 10, options: [colorOption("Black")] },
        { price: 12, options: [colorOption("Black")] },
        { price: 14, options: [colorOption("Black")] },
      ],
    };
    expect(aggregateColorFacets([row], "en")).toEqual([
      expect.objectContaining({ value: "black", count: 1 }),
    ]);
  });

  it("counts Black and Silver independently on one product", () => {
    const row: CatalogLightRow = {
      id: "p1",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      variants: [
        { price: 10, options: [colorOption("Black")] },
        { price: 12, options: [colorOption("Silver")] },
      ],
    };
    const colors = aggregateColorFacets([row], "en");
    expect(colors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: "black", count: 1 }),
        expect.objectContaining({ value: "silver", count: 1 }),
      ]),
    );
  });
});

describe("aggregateSizeFacets product counts", () => {
  it("counts repeated size options on one product once", () => {
    const row: CatalogLightRow = {
      id: "p1",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      variants: [
        { price: 10, options: [sizeOption("M")] },
        { price: 12, options: [sizeOption("M")] },
      ],
    };
    expect(aggregateSizeFacets([row], "en")).toEqual([{ value: "M", count: 1 }]);
  });
});
