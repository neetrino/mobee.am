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
    warrantyYears: null,
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
      images: [],
      published: true,
      isMain: false,
    },
  ],
  media: ["https://cdn.example/a.jpg"],
  productType: "variable",
};

const convertAttrs = [
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
  {
    id: "attr-storage",
    key: "storage",
    name: "Storage",
    type: "select",
    values: [
      { id: "val-256", value: "256GB", label: "256GB" },
      { id: "val-512", value: "512GB", label: "512GB" },
    ],
  },
  {
    id: "attr-sim",
    key: "sim",
    name: "SIM",
    type: "select",
    values: [
      { id: "val-esim", value: "eSIM", label: "eSIM" },
      { id: "val-nano", value: "Nano-SIM", label: "Nano-SIM" },
    ],
  },
];

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
      convertAttrs,
      "AMD"
    );

    expect(rows).toHaveLength(2);
    expect(rows[0]?.databaseVariantId).toBe("db-v1");
    expect(rows[1]?.databaseVariantId).toBe("db-v2");
    expect(rows[0]?.sku).toBe("SKU-RED");
    expect(rows[1]?.sku).toBe("SKU-BLUE");
  });

  it("merges relational options even when JSONB already has a color array", () => {
    const rows = convertApiVariantsToGenerated(
      [
        {
          id: "db-v1",
          price: 10,
          stock: 1,
          sku: "11112",
          attributes: {
            color: [{ valueId: "val-blue", value: "blue", attributeKey: "color" }],
          },
          options: [
            { attributeKey: "color", valueId: "val-blue", value: "blue" },
            { attributeKey: "storage", valueId: "val-256", value: "256GB" },
            { attributeKey: "sim", valueId: "val-esim", value: "eSIM" },
          ],
        },
      ],
      convertAttrs,
      "AMD"
    );

    expect(rows[0]?.selectedValueIds).toEqual(
      ["val-256", "val-blue", "val-esim"].sort()
    );
  });

  it("resolves string JSONB storage/sim labels to catalog value ids", () => {
    const rows = convertApiVariantsToGenerated(
      [
        {
          id: "db-v1",
          price: 10,
          stock: 1,
          sku: "11103",
          attributes: { color: "red", storage: "256GB", sim: "eSIM" },
          options: [],
        },
      ],
      convertAttrs,
      "AMD"
    );

    expect(rows[0]?.selectedValueIds).toEqual(
      ["val-256", "val-esim", "val-red"].sort()
    );
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

  it("emits warrantyYears null when clearing warranty", () => {
    const initial: EditableProductSnapshot = {
      ...baseSnapshot,
      product: { ...baseSnapshot.product, warrantyYears: 3 },
    };
    const current: EditableProductSnapshot = {
      ...baseSnapshot,
      product: { ...baseSnapshot.product, warrantyYears: null },
    };

    const payload = buildPartialProductUpdatePayload({
      initial,
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

    expect(payload.product).toEqual({ warrantyYears: null });
    expect(hasPartialUpdateWork(payload)).toBe(true);
  });

  it("omits warrantyYears when unchanged", () => {
    const initial: EditableProductSnapshot = {
      ...baseSnapshot,
      product: { ...baseSnapshot.product, warrantyYears: 2 },
    };
    const current: EditableProductSnapshot = {
      ...baseSnapshot,
      product: { ...baseSnapshot.product, warrantyYears: 2 },
      basic: { ...baseSnapshot.basic, title: "Shirt Updated" },
    };

    const payload = buildPartialProductUpdatePayload({
      initial,
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

    expect(payload.basic?.title).toBe("Shirt Updated");
    expect(payload.product?.warrantyYears).toBeUndefined();
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

  it("emits isMain only when the main flag changes", () => {
    const processedVariants = [{ databaseVariantId: "db-v1", price: 1000, stock: 5, sku: "SHIRT-RED", isMain: true }];
    const payload = buildPartialProductUpdatePayload({
      initial: baseSnapshot,
      current: { ...baseSnapshot, variants: [{ ...baseSnapshot.variants[0], isMain: true }] },
      processedVariants,
      media: baseSnapshot.media,
    });

    expect(payload.variants?.update).toEqual([{ id: "db-v1", isMain: true }]);
  });
});

describe("variable variant create diff", () => {
  it("emits variants.create for every new processed row without databaseVariantId", () => {
    const current: EditableProductSnapshot = {
      ...baseSnapshot,
      variants: [
        baseSnapshot.variants[0],
        {
          uiId: "ui-v2",
          selectedValueIds: ["val-blue", "val-512"],
          price: "1200",
          compareAtPrice: "",
          stock: "2",
          sku: "SHIRT-BLUE-512",
          images: [],
          published: true,
          isMain: false,
        },
      ],
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
          options: [{ attributeKey: "color", value: "red", valueId: "val-red" }],
        },
        {
          price: 1200,
          stock: 2,
          sku: "SHIRT-BLUE-512",
          published: true,
          options: [
            { attributeKey: "color", value: "blue", valueId: "val-blue" },
            { attributeKey: "storage", value: "512GB", valueId: "val-512" },
          ],
        },
        {
          // Expanded combo from one UI row — must not be dropped
          price: 1300,
          stock: 1,
          sku: "SHIRT-BLUE-1TB",
          published: true,
          options: [
            { attributeKey: "color", value: "blue", valueId: "val-blue" },
            { attributeKey: "storage", value: "1TB", valueId: "val-1tb" },
          ],
        },
      ],
      media: baseSnapshot.media,
    });

    expect(payload.variants?.create).toHaveLength(2);
    expect(payload.variants?.create?.[0]?.sku).toBe("SHIRT-BLUE-512");
    expect(payload.variants?.create?.[1]?.sku).toBe("SHIRT-BLUE-1TB");
    expect(payload.variants?.create?.[0]?.published).toBe(true);
    expect(payload.variants?.update).toBeUndefined();
    expect(payload.variants?.deleteIds).toBeUndefined();
  });
});
