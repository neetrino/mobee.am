import { describe, expect, it } from "vitest";
import { buildRelatedProductsContextFromProduct } from "./build-related-context";

describe("buildRelatedProductsContextFromProduct", () => {
  it("merges primary, persisted, and relation category ids", () => {
    const context = buildRelatedProductsContextFromProduct({
      id: "product-1",
      primaryCategoryId: "primary",
      categoryIds: ["secondary", "primary"],
      categories: [{ id: "relation" }],
    });

    expect(context).toEqual({
      productId: "product-1",
      primaryCategoryId: "primary",
      categoryIds: ["primary", "secondary", "relation"],
    });
  });
});
