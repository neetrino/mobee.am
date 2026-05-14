import { describe, expect, it } from "vitest";
import {
  resolveRelatedCategoryIds,
  sortProductsByRelatedIds,
  type RelatedCategorySource,
} from "./products-related.service";

describe("resolveRelatedCategoryIds", () => {
  it("prefers persisted category ids before relation ids", () => {
    const product: RelatedCategorySource = {
      id: "product-1",
      primaryCategoryId: "primary-category",
      categoryIds: ["secondary-category", "primary-category"],
      categories: [{ id: "stale-relation-category" }],
    };

    expect(resolveRelatedCategoryIds(product)).toEqual([
      "primary-category",
      "secondary-category",
      "stale-relation-category",
    ]);
  });

  it("falls back to relation category ids when persisted ids are missing", () => {
    const product: RelatedCategorySource = {
      id: "product-1",
      categories: [{ id: "relation-category" }],
    };

    expect(resolveRelatedCategoryIds(product)).toEqual(["relation-category"]);
  });
});

describe("sortProductsByRelatedIds", () => {
  it("keeps database related-id order after product transformation", () => {
    const products = [
      { id: "third", title: "Third" },
      { id: "first", title: "First" },
      { id: "second", title: "Second" },
    ];

    expect(sortProductsByRelatedIds(products, ["first", "second"])).toEqual([
      { id: "first", title: "First" },
      { id: "second", title: "Second" },
    ]);
  });
});
