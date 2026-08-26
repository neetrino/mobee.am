import { Prisma } from "@white-shop/db";
import { AppError } from "@/lib/errors/app-error";
import { createAuditLog } from "../audit/write-audit-log";
import { AUDIT_ACTION, AUDIT_TARGET, STOCK_MOVEMENT_REASON } from "../orders/order-fsm.constants";
import type { CommerceRequestContext } from "../orders/order-transition.types";
import { lockVariantForUpdate } from "./stock-balance";
import { createStockMovement } from "./stock-ledger";

export interface InventoryAdjustmentFields {
  variantId: string;
  quantityDelta: number;
  reason: string;
  note?: string;
}

export async function adjustVariantStock(
  tx: Prisma.TransactionClient,
  input: InventoryAdjustmentFields,
  context: CommerceRequestContext,
) {
  const variant = await lockVariantForUpdate(tx, input.variantId);
  if (!variant) {
    throw AppError.notFound("Product variant not found");
  }

  const nextStock = variant.stock + input.quantityDelta;
  if (nextStock < 0) {
    throw AppError.badRequest("Stock cannot be negative");
  }
  if (nextStock < variant.stockReserved) {
    throw AppError.badRequest("Stock cannot be lower than reserved stock");
  }

  const updated = await tx.productVariant.update({
    where: { id: input.variantId },
    data: { stock: nextStock },
    select: { id: true, sku: true, stock: true, stockReserved: true, updatedAt: true },
  });

  const note = input.note?.trim() || null;
  await createStockMovement(tx, context, {
    variantId: updated.id,
    variantIdSnapshot: updated.id,
    skuSnapshot: updated.sku,
    delta: input.quantityDelta,
    reason: STOCK_MOVEMENT_REASON.ADMIN_ADJUSTMENT,
    resultingBalance: updated.stock,
    metadata: { adminReason: input.reason, note },
  });
  await createAuditLog(tx, context, {
    action: AUDIT_ACTION.INVENTORY_ADJUST,
    targetType: AUDIT_TARGET.PRODUCT_VARIANT,
    targetId: updated.id,
    beforeDiff: { stock: variant.stock },
    afterDiff: { stock: updated.stock },
    context: { adminReason: input.reason, note },
  });

  return {
    variantId: updated.id,
    sku: updated.sku,
    stock: updated.stock,
    stockReserved: updated.stockReserved,
    stockAvailable: updated.stock - updated.stockReserved,
    change: {
      reason: input.reason,
      note,
      quantityDelta: input.quantityDelta,
      previousStock: variant.stock,
      nextStock: updated.stock,
    },
    updatedAt: updated.updatedAt.toISOString(),
  };
}
