import { Prisma } from "@white-shop/db";
import { logger } from "@/lib/utils/logger";
import type { CommerceRequestContext, RestockSkip } from "../orders/order-transition.types";
import { RESTOCK_SKIP_REASON, STOCK_MOVEMENT_REASON } from "../orders/order-fsm.constants";
import { aggregateQuantitiesByVariantId } from "./aggregate-variant-quantities";
import { incrementOrderCancelStock } from "./stock-balance";
import { createStockMovement } from "./stock-ledger";

interface CancelRestockItem {
  variantId: string | null;
  sku?: string | null;
  quantity: number;
}

function collectMissingReferenceSkips(
  items: CancelRestockItem[],
  context: CommerceRequestContext,
  orderId: string,
): RestockSkip[] {
  const skipped: RestockSkip[] = [];
  for (const item of items) {
    if (item.variantId != null) {
      continue;
    }
    const skuSnapshot = item.sku ?? null;
    logger.warn("Cancel restock skipped missing variant reference", {
      requestId: context.requestId,
      orderId,
      variantId: null,
      skuSnapshot,
      quantity: item.quantity,
    });
    skipped.push({
      variantId: null,
      skuSnapshot,
      quantity: item.quantity,
      reason: RESTOCK_SKIP_REASON.VARIANT_REFERENCE_MISSING,
    });
  }
  return skipped;
}

function skuByVariantId(items: CancelRestockItem[]): Map<string, string | null> {
  const skuById = new Map<string, string | null>();
  for (const item of items) {
    if (item.variantId == null || skuById.has(item.variantId)) {
      continue;
    }
    skuById.set(item.variantId, item.sku ?? null);
  }
  return skuById;
}

async function restockOneVariant(input: {
  tx: Prisma.TransactionClient;
  context: CommerceRequestContext;
  orderId: string;
  variantId: string;
  skuSnapshot: string | null;
  quantity: number;
}): Promise<RestockSkip | null> {
  const updated = await incrementOrderCancelStock(input.tx, input.variantId, input.quantity);
  if (!updated) {
    logger.warn("Cancel restock skipped missing variant", {
      requestId: input.context.requestId,
      orderId: input.orderId,
      variantId: input.variantId,
      skuSnapshot: input.skuSnapshot,
      quantity: input.quantity,
    });
    return {
      variantId: input.variantId,
      skuSnapshot: input.skuSnapshot,
      quantity: input.quantity,
      reason: RESTOCK_SKIP_REASON.VARIANT_NOT_FOUND,
    };
  }

  await createStockMovement(input.tx, input.context, {
    variantId: input.variantId,
    variantIdSnapshot: input.variantId,
    skuSnapshot: updated.sku,
    delta: input.quantity,
    reason: STOCK_MOVEMENT_REASON.CANCEL,
    orderId: input.orderId,
    resultingBalance: updated.stock,
    metadata: { source: input.context.source },
  });
  return null;
}

/**
 * Restocks on-hand balance for a confirmed cancel transition. Missing variants are skipped.
 */
export async function restockCancelledOrder(input: {
  tx: Prisma.TransactionClient;
  context: CommerceRequestContext;
  orderId: string;
  items: CancelRestockItem[];
}): Promise<RestockSkip[]> {
  const skipped = collectMissingReferenceSkips(input.items, input.context, input.orderId);
  const referenced = input.items.filter(
    (row): row is CancelRestockItem & { variantId: string } => row.variantId != null,
  );
  const skuById = skuByVariantId(referenced);
  const aggregated = aggregateQuantitiesByVariantId(referenced);

  for (const line of aggregated) {
    const skip = await restockOneVariant({
      tx: input.tx,
      context: input.context,
      orderId: input.orderId,
      variantId: line.variantId,
      skuSnapshot: skuById.get(line.variantId) ?? null,
      quantity: line.quantity,
    });
    if (skip) {
      skipped.push(skip);
    }
  }

  return skipped;
}
