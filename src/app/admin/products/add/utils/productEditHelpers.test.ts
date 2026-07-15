import { describe, expect, it } from "vitest";
import { convertApiVariantsToGenerated } from "./convertApiVariantsToGenerated";
import { resolveVariantSku, ensureUniqueSku } from "./variantSku";
import {
  buildPartialProductUpdatePayload,
  hasPartialUpdateWork,
} from "./productUpdateDiff";
import type { EditableProductSnapshot } from "./editableProductSnapshot";

const baseSnapshot: EditableProductSnapshot = {
  basic: { title: "Shirt", slug: "shirt", descriptionHtml: "<p>Hi</p>" },
  product: {
    brandId: "brand-1",
    primaryCategoryId: "cat-1",
    categoryIds: ["cat-1"],
    published: true,
    featured: false,
  },
  labels: [{ id: "label-1", type: "text", value: "New", position: "top-left", color: null }],
  attributeIds: ["attr-color"],
  variants: [
    {
      databaseVariantId: "db-v1",
      uiId: "ui-v1",
      selectedValueIds: ["val-red"],
      price: "1000",
      compareAtPrice: "",
      stock: "5",
      sku: "SHIRT-RED",
      image: null,
      published: true,
    },
  ],
  media: ["https://cdn.example/a.jpg"],
  productType: "variable",
};

describe("convertApiVariantsToGenerated", () => {
  it("preserves databaseVariantId with one row per API variant", () => {
    const rows = convertApiVariantsToGenerated(
      [
        {
          id: "db-v1",
          price: 10,
          stock: 3,
          sku: "SKU-RED",
          options: [{ attributeKey: "color", valueId: "val-red", value: "red" }],
        },
        {
          id: "db-v2",
          price: 12,
          stock: 1,
          sku: "SKU-BLUE",
          options: [{ attributeKey: "color", valueId: "val-blue", value: "blue" }],
        },
      ],
      [
        {
          id: "attr-color",
          key: "color",
          name: "Color",
          type: "select",
          values: [
            { id: "val-red", value: "red", label: "Red" },
            { id: "val-blue", value: "blue", label: "Blue" },
          ],
        },
      ],
      "AMD"
    );

    expect(rows).toHaveLength(2);
    expect(rows[0]?.databaseVariantId).toBe("db-v1");
    expect(rows[1]?.databaseVariantId).toBe("db-v2");
    expect(rows[0]?.sku).toBe("SKU-RED");
    expect(rows[1]?.sku).toBe("SKU-BLUE");
  });
});

describe("resolveVariantSku", () => {
  it("keeps SKU unchanged for persisted variant", () => {
    const sku = resolveVariantSku({
      databaseVariantId: "db-v1",
      userSku: "SHIRT-RED",
      baseSlug: "shirt",
      valueParts: ["RED"],
      variantIndex: 0,
      comboIndex: 0,
    });

    expect(sku).toBe("SHIRT-RED");
  });

  it("does not append suffix to persisted SKU even when valueParts exist", () => {
    const sku = resolveVariantSku({
      databaseVariantId: "db-v1",
      userSku: "SHIRT-RED",
      baseSlug: "shirt",
      valueParts: ["BLUE"],
      variantIndex: 0,
      comboIndex: 1,
    });

    expect(sku).toBe("SHIRT-RED");
  });

  it("uses trimmed manual SKU for new variant", () => {
    const sku = resolveVariantSku({
      userSku: "  CUSTOM-SKU  ",
      baseSlug: "shirt",
      valueParts: ["RED"],
      variantIndex: 0,
      comboIndex: 0,
    });

    expect(sku).toBe("CUSTOM-SKU");
  });

  it("generates SKU for new variant without user input", () => {
    const sku = resolveVariantSku({
      userSku: "",
      baseSlug: "shirt",
      valueParts: ["RED", "M"],
      variantIndex: 0,
      comboIndex: 0,
    });

    expect(sku).toMatch(/^SHIRT-\d+-1-1-RED-M$/);
  });
});

describe("ensureUniqueSku", () => {
  it("appends counter when SKU already used", () => {
    const used = new Set<string>(["SKU-A"]);
    expect(ensureUniqueSku("SKU-A", used)).toBe("SKU-A-1");
    expect(used.has("SKU-A-1")).toBe(true);
  });
});

describe("buildPartialProductUpdatePayload", () => {
  it("emits price-only variants.update when only price changed", () => {
    const current: EditableProductSnapshot = {
      ...baseSnapshot,
      variants: [{ ...baseSnapshot.variants[0], price: "1200" }],
    };

    const payload = buildPartialProductUpdatePayload({
      initial: baseSnapshot,
      current,
      processedVariants: [
        {
          databaseVariantId: "db-v1",
          price: 1200,
          stock: 5,
          sku: "SHIRT-RED",
          published: true,
          options: [{ attributeKey: "color", value: "red", valueId: "val-red" }],
        },
      ],
      media: baseSnapshot.media,
    });

    expect(payload.basic).toBeUndefined();
    expect(payload.product).toBeUndefined();
    expect(payload.attributes).toBeUndefined();
    expect(payload.variants).toEqual({
      update: [{ id: "db-v1", price: 1200 }],
    });
    expect(hasPartialUpdateWork(payload)).toBe(true);
  });

  it("omits attributes when selected attrs unchanged and only price changed", () => {
    const current: EditableProductSnapshot = {
      ...baseSnapshot,
      variants: [{ ...baseSnapshot.variants[0], price: "1200" }],
    };

    const payload = buildPartialProductUpdatePayload({
      initial: baseSnapshot,
      current,
      processedVariants: [
        {
          databaseVariantId: "db-v1",
          price: 1200,
          stock: 5,
          sku: "SHIRT-RED",
          published: true,
          options: [
            { attributeKey: "color", value: "red", valueId: "val-red" },
            { attributeKey: "size", value: "M", valueId: "val-m" },
          ],
        },
      ],
      media: baseSnapshot.media,
    });

    expect(payload.attributes).toBeUndefined();
    expect(payload.variants?.update).toEqual([{ id: "db-v1", price: 1200 }]);
  });

  it("emits attributes diff when selected attribute set changes", () => {
    const current: EditableProductSnapshot = {
      ...baseSnapshot,
      attributeIds: ["attr-color", "attr-size"],
    };

    const payload = buildPartialProductUpdatePayload({
      initial: baseSnapshot,
      current,
      processedVariants: [
        {
          databaseVariantId: "db-v1",
          price: 1000,
          stock: 5,
          sku: "SHIRT-RED",
          published: true,
        },
      ],
      media: baseSnapshot.media,
    });

    expect(payload.attributes).toEqual({ addIds: ["attr-size"] });
  });

  it("returns empty work flags when nothing changed", () => {
    const payload = buildPartialProductUpdatePayload({
      initial: baseSnapshot,
      current: baseSnapshot,
      processedVariants: [
        {
          databaseVariantId: "db-v1",
          price: 1000,
          stock: 5,
          sku: "SHIRT-RED",
          published: true,
          options: [{ attributeKey: "color", value: "red", valueId: "val-red" }],
        },
      ],
      media: baseSnapshot.media,
    });

    expect(hasPartialUpdateWork(payload)).toBe(false);
  });
});

describe("databaseVariantId preservation", () => {
  it("includes databaseVariantId in update diff id field", () => {
    const payload = buildPartialProductUpdatePayload({
      initial: baseSnapshot,
      current: {
        ...baseSnapshot,
        variants: [{ ...baseSnapshot.variants[0], stock: "10" }],
      },
      processedVariants: [
        {
          databaseVariantId: "db-v1",
          price: 1000,
          stock: 10,
          sku: "SHIRT-RED",
        },
      ],
      media: baseSnapshot.media,
    });

    expect(payload.variants?.update?.[0]?.id).toBe("db-v1");
    expect(payload.variants?.update?.[0]?.stock).toBe(10);
    expect(payload.variants?.update?.[0]?.sku).toBeUndefined();
  });
});
