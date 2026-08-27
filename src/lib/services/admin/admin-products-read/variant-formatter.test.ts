import { describe, expect, it } from "vitest";
import { formatVariantForAdmin } from "./variant-formatter";
import { mergeAdminVariantAttributes } from "./variant-formatter-attributes";

describe("mergeAdminVariantAttributes", () => {
  it("prefers relational color over JSONB string attributes", () => {
    const merged = mergeAdminVariantAttributes({
      options: [
        {
          attributeKey: "color",
          value: "Jetblack",
          valueId: "av-jet",
          attributeValue: {
            id: "av-jet",
            value: "Jetblack",
            attribute: { key: "color" },
          },
        },
        {
          attributeKey: "storage",
          value: "256GB",
          valueId: "av-256",
          attributeValue: {
            id: "av-256",
            value: "256GB",
            attribute: { key: "storage" },
          },
        },
      ],
      jsonAttributes: { storage: "256GB", connectivity: "5G", sim: "eSIM" },
    });

    expect(merged.color).toBe("Jetblack");
    expect(merged.colorValues).toEqual(["Jetblack"]);
    expect(merged.attributes?.color?.[0]?.value).toBe("Jetblack");
  });

  it("fills color from JSONB string when options omit it", () => {
    const merged = mergeAdminVariantAttributes({
      options: [
        {
          attributeKey: "storage",
          value: "512GB",
          valueId: "av-512",
          attributeValue: {
            id: "av-512",
            value: "512GB",
            attribute: { key: "storage" },
          },
        },
      ],
      jsonAttributes: { color: "Silver Shadow", storage: "512GB" },
    });

    expect(merged.color).toBe("Silver Shadow");
    expect(merged.colorValues).toEqual(["Silver Shadow"]);
  });
});

describe("formatVariantForAdmin", () => {
  it("does not invent a default color when options have none", () => {
    const formatted = formatVariantForAdmin({
      id: "v1",
      price: 10,
      compareAtPrice: null,
      stock: 1,
      sku: "mobilecentre-32308",
      imageUrl: null,
      published: true,
      attributes: { storage: "256GB", sim: "eSIM" },
      options: [
        {
          attributeKey: "storage",
          value: "256GB",
          valueId: "av-256",
          attributeValue: {
            id: "av-256",
            value: "256GB",
            attribute: { key: "storage" },
          },
        },
      ],
    });

    expect(formatted.color).toBe("");
    expect(formatted.colorValues).toEqual([]);
  });
});
