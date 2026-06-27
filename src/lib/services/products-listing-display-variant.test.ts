import { describe, expect, it } from "vitest";
import {
  findListingDisplayVariant,
  resolveListingProductImage,
} from "./products-listing-display-variant";
import type { ProductWithRelations } from "./products-find-query.service";

function makeProduct(
  overrides: Partial<ProductWithRelations> & {
    variants?: ProductWithRelations["variants"];
    media?: ProductWithRelations["media"];
  } = {},
): ProductWithRelations {
  return {
    id: "p1",
    media: overrides.media ?? ["https://cdn.example/default.png"],
    variants: overrides.variants ?? [],
    ...overrides,
  } as ProductWithRelations;
}

describe("findListingDisplayVariant", () => {
  it("returns null when no color filter is set", () => {
    const variants = [
      {
        id: "v1",
        price: 100,
        stock: 5,
        imageUrl: "https://cdn.example/white.png",
        options: [{ attributeKey: "color", value: "White" }],
      },
    ] as ProductWithRelations["variants"];

    expect(findListingDisplayVariant(variants, undefined, "en")).toBeNull();
  });

  it("prefers the last selected color when multiple colors are in the filter", () => {
    const variants = [
      {
        id: "v-blue",
        price: 100,
        stock: 5,
        imageUrl: "https://cdn.example/blue.png",
        options: [{ attributeKey: "color", value: "Deep Blue" }],
      },
      {
        id: "v-orange",
        price: 120,
        stock: 3,
        imageUrl: "https://cdn.example/orange.png",
        options: [{ attributeKey: "color", value: "Cosmic Orange" }],
      },
    ] as ProductWithRelations["variants"];

    const result = findListingDisplayVariant(
      variants,
      "deep blue,cosmic orange",
      "en",
    );
    expect(result?.id).toBe("v-orange");
  });
});

describe("resolveListingProductImage", () => {
  it("uses the display variant image instead of default product media", () => {
    const product = makeProduct({
      media: ["https://cdn.example/default.png"],
    });
    const displayVariant = {
      id: "v-orange",
      price: 120,
      stock: 3,
      imageUrl: "https://cdn.example/orange.png",
      options: [{ attributeKey: "color", value: "Orange" }],
    } as ProductWithRelations["variants"][number];

    expect(resolveListingProductImage(product, displayVariant, "orange", "en")).toBe(
      "https://cdn.example/orange.png",
    );
  });
});
