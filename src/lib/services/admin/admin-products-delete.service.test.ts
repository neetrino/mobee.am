import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  productFindUnique: vi.fn(),
  productUpdate: vi.fn(),
  invalidateCatalogCaches: vi.fn(),
  loggerWarn: vi.fn(),
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
    },
  };
});

vi.mock("@/lib/catalog/invalidate-catalog-cache", () => ({
  invalidateCatalogCaches: mocks.invalidateCatalogCaches,
}));

vi.mock("@/lib/utils/logger", () => ({
  logger: {
    warn: mocks.loggerWarn,
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

import { adminProductsDeleteService } from "./admin-products-delete.service";

describe("adminProductsDeleteService catalog invalidation", () => {
  beforeEach(() => {
    mocks.productFindUnique.mockReset();
    mocks.productUpdate.mockReset();
    mocks.invalidateCatalogCaches.mockReset();
    mocks.loggerWarn.mockReset();
    mocks.invalidateCatalogCaches.mockResolvedValue(undefined);
  });

  it("invalidates catalog caches after a successful soft delete", async () => {
    mocks.productFindUnique.mockResolvedValue({ id: "p1" });
    mocks.productUpdate.mockResolvedValue({ id: "p1" });
    await expect(adminProductsDeleteService.deleteProduct("p1")).resolves.toEqual({
      success: true,
    });
    expect(mocks.invalidateCatalogCaches).toHaveBeenCalledTimes(1);
  });

  it("invalidates catalog caches after a successful discount update", async () => {
    mocks.productFindUnique.mockResolvedValue({ id: "p1", discountPercent: 0 });
    mocks.productUpdate.mockResolvedValue({ id: "p1", discountPercent: 10 });
    await expect(
      adminProductsDeleteService.updateProductDiscount("p1", 10),
    ).resolves.toEqual({ success: true, discountPercent: 10 });
    expect(mocks.invalidateCatalogCaches).toHaveBeenCalledTimes(1);
  });

  it("does not fail the mutation when invalidation throws", async () => {
    mocks.productFindUnique.mockResolvedValue({ id: "p1" });
    mocks.productUpdate.mockResolvedValue({ id: "p1" });
    mocks.invalidateCatalogCaches.mockRejectedValue(new Error("redis down"));
    await expect(adminProductsDeleteService.deleteProduct("p1")).resolves.toEqual({
      success: true,
    });
    expect(mocks.loggerWarn).toHaveBeenCalled();
  });
});
