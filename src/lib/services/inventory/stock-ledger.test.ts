import { describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors/app-error";
import { STOCK_MOVEMENT_REASON } from "../orders/order-fsm.constants";
import type { CommerceRequestContext } from "../orders/order-transition.types";
import { restockCancelledOrder } from "./cancel-restock";
import { decrementCheckoutStock } from "./decrement-checkout-stock";
import { adjustVariantStock } from "./adjust-variant-stock";

const context: CommerceRequestContext = {
  requestId: "req-1",
  actorUserId: "admin-1",
  source: "admin",
};

function createTx(overrides: Record<string, unknown> = {}) {
  return {
    productVariant: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    stockMovement: { create: vi.fn().mockResolvedValue({}) },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    $queryRaw: vi.fn(),
    ...overrides,
  };
}

describe("checkout StockMovement payload", () => {
  it("writes one negative order movement per aggregated variant", async () => {
    const tx = createTx({
      $queryRaw: vi.fn()
        .mockResolvedValueOnce([{ stock: 7, sku: "SKU-1" }]),
    });

    await decrementCheckoutStock({
      tx: tx as never,
      context: { ...context, source: "checkout" },
      orderId: "order-1",
      isUserCartCheckout: false,
      items: [
        { variantId: "v1", quantity: 2, sku: "SKU-1" },
        { variantId: "v1", quantity: 1, sku: "SKU-1" },
      ],
    });

    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        variantId: "v1",
        variantIdSnapshot: "v1",
        skuSnapshot: "SKU-1",
        delta: -3,
        reason: STOCK_MOVEMENT_REASON.ORDER,
        orderId: "order-1",
        resultingBalance: 7,
        correlationId: "req-1",
        actorUserId: "admin-1",
      }),
    });
  });

  it("throws the existing 422 contract when decrement matches no rows", async () => {
    const tx = createTx({
      $queryRaw: vi.fn().mockResolvedValueOnce([]),
    });
    tx.productVariant.findUnique.mockResolvedValue({ sku: "SKU-1", stock: 0, stockReserved: 0 });

    await expect(
      decrementCheckoutStock({
        tx: tx as never,
        context: { ...context, source: "checkout" },
        orderId: "order-1",
        isUserCartCheckout: false,
        items: [{ variantId: "v1", quantity: 1, sku: "SKU-1" }],
      }),
    ).rejects.toMatchObject({
      status: 422,
      title: "Insufficient stock",
      detail: "Insufficient stock for SKU SKU-1. Available: 0, requested: 1",
    });
    expect(tx.stockMovement.create).not.toHaveBeenCalled();
  });

  it("reports unreserved stock on 422 instead of inflated on-hand", async () => {
    const tx = createTx({
      $queryRaw: vi.fn().mockResolvedValueOnce([]),
    });
    tx.productVariant.findUnique.mockResolvedValue({
      sku: "SKU-1",
      stock: 5,
      stockReserved: 4,
    });

    await expect(
      decrementCheckoutStock({
        tx: tx as never,
        context: { ...context, source: "checkout" },
        orderId: "order-1",
        isUserCartCheckout: false,
        items: [{ variantId: "v1", quantity: 2, sku: "SKU-1" }],
      }),
    ).rejects.toMatchObject({
      status: 422,
      title: "Insufficient stock",
      detail: "Insufficient stock for SKU SKU-1. Available: 1, requested: 2",
    });
  });
});

describe("cancellation restock", () => {
  it("creates a positive cancel movement and skips missing variants", async () => {
    const tx = createTx({
      $queryRaw: vi.fn()
        .mockResolvedValueOnce([{ stock: 4, sku: "SKU-1" }])
        .mockResolvedValueOnce([]),
    });

    const skipped = await restockCancelledOrder({
      tx: tx as never,
      context,
      orderId: "order-1",
      items: [
        { variantId: "v1", sku: "SKU-1", quantity: 2 },
        { variantId: "v1", sku: "SKU-1", quantity: 1 },
        { variantId: "missing", sku: "SKU-GONE", quantity: 2 },
        { variantId: null, sku: "SKU-NULL", quantity: 9 },
      ],
    });

    expect(tx.stockMovement.create).toHaveBeenCalledTimes(1);
    expect(tx.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        variantId: "v1",
        delta: 3,
        reason: STOCK_MOVEMENT_REASON.CANCEL,
        resultingBalance: 4,
        orderId: "order-1",
      }),
    });
    expect(skipped).toEqual([
      {
        variantId: null,
        skuSnapshot: "SKU-NULL",
        quantity: 9,
        reason: "variant_reference_missing",
      },
      {
        variantId: "missing",
        skuSnapshot: "SKU-GONE",
        quantity: 2,
        reason: "variant_not_found",
      },
    ]);
  });

  it("records each null-variant line without creating a stock movement", async () => {
    const tx = createTx();
    const skipped = await restockCancelledOrder({
      tx: tx as never,
      context,
      orderId: "order-1",
      items: [{ variantId: null, sku: "ORPHAN", quantity: 1 }],
    });
    expect(tx.$queryRaw).not.toHaveBeenCalled();
    expect(tx.stockMovement.create).not.toHaveBeenCalled();
    expect(skipped).toEqual([
      {
        variantId: null,
        skuSnapshot: "ORPHAN",
        quantity: 1,
        reason: "variant_reference_missing",
      },
    ]);
  });

  it("records a nonexistent variant without creating a stock movement", async () => {
    const tx = createTx({
      $queryRaw: vi.fn().mockResolvedValueOnce([]),
    });
    const skipped = await restockCancelledOrder({
      tx: tx as never,
      context,
      orderId: "order-1",
      items: [{ variantId: "gone", sku: "SKU-GONE", quantity: 4 }],
    });
    expect(tx.stockMovement.create).not.toHaveBeenCalled();
    expect(skipped).toEqual([
      {
        variantId: "gone",
        skuSnapshot: "SKU-GONE",
        quantity: 4,
        reason: "variant_not_found",
      },
    ]);
  });
});

describe("admin inventory adjustment boundaries", () => {
  it("rejects negative resulting stock", async () => {
    const tx = createTx({
      $queryRaw: vi.fn().mockResolvedValueOnce([
        { id: "v1", stock: 1, stockReserved: 0, sku: "SKU-1" },
      ]),
    });

    await expect(
      adjustVariantStock(tx as never, { variantId: "v1", quantityDelta: -2, reason: "count" }, context),
    ).rejects.toBeInstanceOf(AppError);
    expect(tx.stockMovement.create).not.toHaveBeenCalled();
  });

  it("rejects stock below reserved and writes ledger on success", async () => {
    const reservedTx = createTx({
      $queryRaw: vi.fn().mockResolvedValueOnce([
        { id: "v1", stock: 5, stockReserved: 4, sku: "SKU-1" },
      ]),
    });
    await expect(
      adjustVariantStock(
        reservedTx as never,
        { variantId: "v1", quantityDelta: -2, reason: "count" },
        context,
      ),
    ).rejects.toBeInstanceOf(AppError);

    const okTx = createTx({
      $queryRaw: vi.fn().mockResolvedValueOnce([
        { id: "v1", stock: 5, stockReserved: 1, sku: "SKU-1" },
      ]),
    });
    okTx.productVariant.update.mockResolvedValue({
      id: "v1",
      sku: "SKU-1",
      stock: 7,
      stockReserved: 1,
      updatedAt: new Date("2026-08-25T00:00:00.000Z"),
    });

    const result = await adjustVariantStock(
      okTx as never,
      { variantId: "v1", quantityDelta: 2, reason: "manual-count", note: "shelf" },
      context,
    );

    expect(result.stock).toBe(7);
    expect(okTx.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        reason: STOCK_MOVEMENT_REASON.ADMIN_ADJUSTMENT,
        delta: 2,
        resultingBalance: 7,
        metadata: { adminReason: "manual-count", note: "shelf" },
      }),
    });
    expect(okTx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "inventory.adjust",
        targetType: "ProductVariant",
        actorUserId: "admin-1",
        requestId: "req-1",
        correlationId: "req-1",
      }),
    });
  });
});
