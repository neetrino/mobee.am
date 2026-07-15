import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  productFindUnique: vi.fn(),
  productUpdate: vi.fn(),
  productTranslationFindUnique: vi.fn(),
  productTranslationUpsert: vi.fn(),
  productLabelDeleteMany: vi.fn(),
  productLabelCreateMany: vi.fn(),
  productLabelUpdateMany: vi.fn(),
  productAttributeDeleteMany: vi.fn(),
  productAttributeCreateMany: vi.fn(),
  productVariantFindUnique: vi.fn(),
  productVariantFindMany: vi.fn(),
  productVariantFindFirst: vi.fn(),
  productVariantUpdate: vi.fn(),
  productVariantCreate: vi.fn(),
  productVariantDeleteMany: vi.fn(),
  productVariantOptionDeleteMany: vi.fn(),
  attributeValueFindMany: vi.fn(),
  attributeValueFindUnique: vi.fn(),
  attributeValueUpdate: vi.fn(),
  transaction: vi.fn(),
  ensureProductAttributesTable: vi.fn(),
  revalidateProductCache: vi.fn(),
}));

vi.mock("@white-shop/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@white-shop/db")>();
  return {
    ...actual,
    db: {
      product: {
        findUnique: mocks.productFindUnique,
        update: mocks.productUpdate,
      },
      productTranslation: {
        findUnique: mocks.productTranslationFindUnique,
        upsert: mocks.productTranslationUpsert,
      },
      productLabel: {
        deleteMany: mocks.productLabelDeleteMany,
        createMany: mocks.productLabelCreateMany,
        updateMany: mocks.productLabelUpdateMany,
      },
      productAttribute: {
        deleteMany: mocks.productAttributeDeleteMany,
        createMany: mocks.productAttributeCreateMany,
      },
      productVariant: {
        findUnique: mocks.productVariantFindUnique,
        findMany: mocks.productVariantFindMany,
        findFirst: mocks.productVariantFindFirst,
        update: mocks.productVariantUpdate,
        create: mocks.productVariantCreate,
        deleteMany: mocks.productVariantDeleteMany,
      },
      productVariantOption: {
        deleteMany: mocks.productVariantOptionDeleteMany,
      },
      attributeValue: {
        findMany: mocks.attributeValueFindMany,
        findUnique: mocks.attributeValueFindUnique,
        update: mocks.attributeValueUpdate,
      },
      $transaction: mocks.transaction,
    },
  };
});

vi.mock("../../../utils/db-ensure", () => ({
  ensureProductAttributesTable: mocks.ensureProductAttributesTable,
}));

vi.mock("./cache-revalidator", () => ({
  revalidateProductCache: mocks.revalidateProductCache,
}));

import { updateProduct } from "./product-update-operations";
import { updateVariantPartial } from "./variant-updater";
import { updateAttributeValueImageUrls } from "./attribute-value-updater";
import { adminProductsUpdateService } from "../admin-products-update.service";

function buildTxClient() {
  return {
    product: {
      findUnique: mocks.productFindUnique,
      update: mocks.productUpdate,
    },
    productTranslation: {
      upsert: mocks.productTranslationUpsert,
    },
    productLabel: {
      deleteMany: mocks.productLabelDeleteMany,
      createMany: mocks.productLabelCreateMany,
      updateMany: mocks.productLabelUpdateMany,
    },
    productAttribute: {
      deleteMany: mocks.productAttributeDeleteMany,
      createMany: mocks.productAttributeCreateMany,
    },
    productVariant: {
      findUnique: mocks.productVariantFindUnique,
      findMany: mocks.productVariantFindMany,
      findFirst: mocks.productVariantFindFirst,
      update: mocks.productVariantUpdate,
      create: mocks.productVariantCreate,
      deleteMany: mocks.productVariantDeleteMany,
    },
    productVariantOption: {
      deleteMany: mocks.productVariantOptionDeleteMany,
    },
    attributeValue: {
      findMany: mocks.attributeValueFindMany,
      findUnique: mocks.attributeValueFindUnique,
      update: mocks.attributeValueUpdate,
    },
  };
}

describe("product partial update operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(
      async (fn: (tx: ReturnType<typeof buildTxClient>) => Promise<unknown>) =>
        fn(buildTxClient())
    );
    mocks.productUpdate.mockResolvedValue({
      updatedAt: new Date("2026-07-15T12:00:00.000Z"),
    });
    mocks.ensureProductAttributesTable.mockResolvedValue(true);
    mocks.productTranslationFindUnique.mockResolvedValue({ slug: "phone" });
  });

  it("price-only does not touch labels/attributes/options or ensure-table", async () => {
    mocks.productFindUnique.mockResolvedValue({
      id: "p1",
      publishedAt: new Date(),
      updatedAt: new Date("2026-07-01T00:00:00.000Z"),
    });
    mocks.productVariantFindUnique.mockResolvedValue({
      id: "v1",
      productId: "p1",
    });
    mocks.productVariantUpdate.mockResolvedValue({ id: "v1" });

    const result = await updateProduct("p1", {
      variants: { update: [{ id: "v1", price: 250 }] },
    });

    expect(result.success).toBe(true);
    expect(result.didUpdate).toBe(true);
    expect(mocks.ensureProductAttributesTable).not.toHaveBeenCalled();
    expect(mocks.productLabelDeleteMany).not.toHaveBeenCalled();
    expect(mocks.productLabelCreateMany).not.toHaveBeenCalled();
    expect(mocks.productAttributeDeleteMany).not.toHaveBeenCalled();
    expect(mocks.productAttributeCreateMany).not.toHaveBeenCalled();
    expect(mocks.productVariantOptionDeleteMany).not.toHaveBeenCalled();
    expect(mocks.attributeValueUpdate).not.toHaveBeenCalled();
    expect(mocks.productTranslationUpsert).not.toHaveBeenCalled();
    expect(mocks.productVariantUpdate).toHaveBeenCalledWith({
      where: { id: "v1" },
      data: { price: 250 },
    });
  });

  it("rejects cross-product variant ownership", async () => {
    mocks.productFindUnique.mockResolvedValue({
      id: "p1",
      publishedAt: null,
      updatedAt: new Date(),
    });
    mocks.productVariantFindUnique.mockResolvedValue({
      id: "v-other",
      productId: "p-other",
    });

    await expect(
      updateProduct("p1", {
        variants: { update: [{ id: "v-other", price: 10 }] },
      })
    ).rejects.toMatchObject({
      status: 403,
      title: "Variant ownership mismatch",
    });
  });

  it("options absent means no option writes", async () => {
    const tx = buildTxClient();
    mocks.productVariantFindUnique.mockResolvedValue({
      id: "v1",
      productId: "p1",
    });
    mocks.productVariantUpdate.mockResolvedValue({ id: "v1" });

    await updateVariantPartial(
      { id: "v1", stock: 5 },
      "p1",
      "en",
      tx as never
    );

    expect(mocks.productVariantOptionDeleteMany).not.toHaveBeenCalled();
    expect(mocks.productVariantUpdate).toHaveBeenCalledWith({
      where: { id: "v1" },
      data: { stock: 5 },
    });
  });

  it("empty update skips transaction and heavy work", async () => {
    const updatedAt = new Date("2026-06-01T00:00:00.000Z");
    mocks.productFindUnique.mockResolvedValue({
      id: "p1",
      publishedAt: null,
      updatedAt,
    });

    const result = await updateProduct("p1", { locale: "en" });

    expect(result).toMatchObject({
      success: true,
      id: "p1",
      didUpdate: false,
      updatedAt,
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.ensureProductAttributesTable).not.toHaveBeenCalled();
  });

  it("legacy full payload normalizes and runs replace-style work", async () => {
    mocks.productFindUnique.mockResolvedValue({
      id: "p1",
      publishedAt: null,
      updatedAt: new Date(),
    });
    mocks.productVariantFindMany.mockResolvedValue([
      { id: "v1", sku: "SKU-1" },
    ]);
    mocks.productVariantFindUnique.mockResolvedValue({
      id: "v1",
      productId: "p1",
    });
    mocks.productVariantUpdate.mockResolvedValue({ id: "v1" });
    mocks.attributeValueFindMany.mockResolvedValue([]);

    await updateProduct("p1", {
      title: "Legacy Phone",
      slug: "legacy-phone",
      brandId: "b1",
      published: true,
      labels: [{ type: "sale", value: "-10%", position: "top" }],
      attributeIds: ["attr-1"],
      variants: [
        {
          id: "v1",
          price: 100,
          stock: 3,
          sku: "SKU-1",
        },
      ],
      locale: "en",
    });

    expect(mocks.ensureProductAttributesTable).toHaveBeenCalled();
    expect(mocks.productTranslationUpsert).toHaveBeenCalled();
    expect(mocks.productLabelDeleteMany).toHaveBeenCalledWith({
      where: { productId: "p1" },
    });
    expect(mocks.productAttributeDeleteMany).toHaveBeenCalledWith({
      where: { productId: "p1" },
    });
    expect(mocks.productVariantUpdate).toHaveBeenCalled();
  });

  it("image sync after commit failure does not throw to client", async () => {
    mocks.productFindUnique
      .mockResolvedValueOnce({
        id: "p1",
        publishedAt: null,
        updatedAt: new Date(),
      })
      .mockResolvedValue(null);

    // Force image sync path via create
    mocks.productVariantCreate.mockResolvedValue({ id: "v-new" });
    mocks.productVariantFindFirst.mockResolvedValue(null);
    mocks.attributeValueFindMany.mockResolvedValue([]);

    // Make post-commit sync throw internally — updater swallows; also spy logger path
    mocks.productVariantFindMany.mockRejectedValueOnce(
      new Error("sync boom")
    );

    const result = await updateProduct("p1", {
      variants: {
        create: [{ price: 10, stock: 1, imageUrl: "https://cdn.example/a.jpg" }],
      },
    });

    expect(result.success).toBe(true);
    expect(result.didUpdate).toBe(true);
  });

  it("updateAttributeValueImageUrls swallows errors", async () => {
    mocks.productVariantFindMany.mockRejectedValue(new Error("db down"));
    await expect(updateAttributeValueImageUrls("p1")).resolves.toBeUndefined();
  });

  it("service returns lightweight payload and skips cache on empty update", async () => {
    const updatedAt = new Date("2026-05-01T00:00:00.000Z");
    mocks.productFindUnique.mockResolvedValue({
      id: "p1",
      publishedAt: null,
      updatedAt,
    });

    const result = await adminProductsUpdateService.updateProduct("p1", {});
    expect(result).toEqual({
      success: true,
      id: "p1",
      updatedAt,
    });
    expect(mocks.revalidateProductCache).not.toHaveBeenCalled();
  });

  it("service revalidates cache only when something updated", async () => {
    mocks.productFindUnique.mockResolvedValue({
      id: "p1",
      publishedAt: null,
      updatedAt: new Date(),
    });
    mocks.productVariantFindUnique.mockResolvedValue({
      id: "v1",
      productId: "p1",
    });
    mocks.productVariantUpdate.mockResolvedValue({ id: "v1" });

    await adminProductsUpdateService.updateProduct("p1", {
      variants: { update: [{ id: "v1", price: 12 }] },
    });

    expect(mocks.revalidateProductCache).toHaveBeenCalled();
  });
});
