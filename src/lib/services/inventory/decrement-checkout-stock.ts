import type { Prisma } from "@white-shop/db";
import type { CommerceRequestContext } from "../orders/order-transition.types";
import { STOCK_MOVEMENT_REASON } from "../orders/order-fsm.constants";
import { aggregateQuantitiesByVariantId } from "./aggregate-variant-quantities";
import { availableUnreservedStock } from "./available-stock";
import {
  decrementGuestOrderStock,
  decrementUserCartOrderStock,
} from "./stock-balance";
import { createStockMovement } from "./stock-ledger";

export interface CheckoutStockLine {
  variantId: string;
  quantity: number;
  sku?: string | null;
}

function insufficientStockError(sku: string, available: number, requested: number) {
  return {
    status: 422,
    type: "https://api.shop.am/problems/validation-error",
    title: "Insufficient stock",
    detail: `Insufficient stock for SKU ${sku}. Available: ${available}, requested: ${requested}`,
  };
}

async function readVariantStock(
  tx: Prisma.TransactionClient,
  variantId: string,
): Promise<{ sku: string | null; stock: number; stockReserved: number } | null> {
  return tx.productVariant.findUnique({
    where: { id: variantId },
    select: { sku: true, stock: true, stockReserved: true },
  });
}

async function decrementOneVariant(input: {
  tx: Prisma.TransactionClient;
  variantId: string;
  quantity: number;
  isUserCartCheckout: boolean;
}): Promise<{ stock: number; sku: string | null }> {
  const updated = input.isUserCartCheckout
    ? await decrementUserCartOrderStock(input.tx, input.variantId, input.quantity)
    : await decrementGuestOrderStock(input.tx, input.variantId, input.quantity);

  if (updated) {
    return updated;
  }

  const variant = await readVariantStock(input.tx, input.variantId);
  throw insufficientStockError(
    variant?.sku ?? input.variantId,
    availableUnreservedStock(variant?.stock ?? 0, variant?.stockReserved ?? 0),
    input.quantity,
  );
}

/**
 * Atomically decrements on-hand stock for checkout and writes one StockMovement per variant.
 */
export async function decrementCheckoutStock(input: {
  tx: Prisma.TransactionClient;
  context: CommerceRequestContext;
  orderId: string;
  items: CheckoutStockLine[];
  isUserCartCheckout: boolean;
}): Promise<void> {
  const aggregated = aggregateQuantitiesByVariantId(input.items);

  for (const line of aggregated) {
    const updated = await decrementOneVariant({
      tx: input.tx,
      variantId: line.variantId,
      quantity: line.quantity,
      isUserCartCheckout: input.isUserCartCheckout,
    });

    await createStockMovement(input.tx, input.context, {
      variantId: line.variantId,
      variantIdSnapshot: line.variantId,
      skuSnapshot: updated.sku,
      delta: -line.quantity,
      reason: STOCK_MOVEMENT_REASON.ORDER,
      orderId: input.orderId,
      resultingBalance: updated.stock,
      metadata: { source: input.context.source },
    });
  }
}
