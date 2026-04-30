import { describe, expect, it } from "vitest";
import { findVariantByAllAttributes, findVariantByColorAndSize } from "./variant-finders";
import type { Product, ProductVariant } from "../types";

const buildVariant = (
  id: string,
  stock: number,
  options: ProductVariant["options"],
  imageUrl?: string,
): ProductVariant => ({
  id,
  sku: `SKU-${id}`,
  price: 100,
  stock,
  available: stock > 0,
  options,
  imageUrl,
});

const baseProduct: Product = {
  id: "p-1",
  slug: "demo-product",
  title: "Demo Product",
  media: [],
  variants: [
    buildVariant(
      "v-red-s-cotton",
      0,
      [
        { key: "color", attribute: "color", value: "Red" },
        { key: "size", attribute: "size", value: "S" },
        { key: "material", attribute: "material", value: "Cotton", valueId: "mat-cotton" },
      ],
      "red-s.jpg",
    ),
    buildVariant("v-red-m-cotton", 4, [
      { key: "color", attribute: "color", value: "red" },
      { key: "size", attribute: "size", value: "M" },
      { key: "material", attribute: "material", value: "cotton", valueId: "mat-cotton" },
    ]),
    buildVariant(
      "v-blue-s-linen",
      6,
      [
        { key: "color", attribute: "color", value: "Blue" },
        { key: "color", attribute: "color", value: "Navy" },
        { key: "size", attribute: "size", value: "S" },
        { key: "material", attribute: "material", value: "Linen", valueId: "mat-linen" },
      ],
      "blue-s.jpg",
    ),
  ],
};

describe("variant-finders", () => {
  it("prefers exact color+size match", () => {
    const variant = findVariantByColorAndSize(baseProduct, "red", "m");
    expect(variant?.id).toBe("v-red-m-cotton");
  });

  it("falls back to in-stock same-color variant when exact size is unavailable", () => {
    const variant = findVariantByColorAndSize(baseProduct, "red", "s");
    expect(variant?.id).toBe("v-red-s-cotton");

    const fallbackVariant = findVariantByColorAndSize(baseProduct, "red", "xl");
    expect(fallbackVariant?.id).toBe("v-red-m-cotton");
  });

  it("matches color across multiple color options in one variant", () => {
    const variant = findVariantByColorAndSize(baseProduct, "navy", "s");
    expect(variant?.id).toBe("v-blue-s-linen");
  });

  it("resolves by all attributes using valueId when provided", () => {
    const selectedAttributes = new Map<string, string>([["material", "mat-linen"]]);
    const variant = findVariantByAllAttributes(baseProduct, "blue", "s", selectedAttributes);
    expect(variant?.id).toBe("v-blue-s-linen");
  });

  it("falls back to color+size resolution when full attribute match is impossible", () => {
    const selectedAttributes = new Map<string, string>([["material", "mat-silk"]]);
    const variant = findVariantByAllAttributes(baseProduct, "red", "m", selectedAttributes);
    expect(variant?.id).toBe("v-red-m-cotton");
  });
});
