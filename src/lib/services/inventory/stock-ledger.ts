import { Prisma } from "@white-shop/db";
import type { CommerceRequestContext } from "../orders/order-transition.types";
import { STOCK_MOVEMENT_REASON } from "../orders/order-fsm.constants";

export type StockMovementReason =
  (typeof STOCK_MOVEMENT_REASON)[keyof typeof STOCK_MOVEMENT_REASON];

export interface StockMovementWrite {
  variantId: string | null;
  variantIdSnapshot: string;
  skuSnapshot: string | null;
  delta: number;
  reason: StockMovementReason;
  orderId?: string | null;
  resultingBalance: number;
  metadata?: Prisma.InputJsonValue;
}

export async function createStockMovement(
  tx: Prisma.TransactionClient,
  context: CommerceRequestContext,
  input: StockMovementWrite,
): Promise<void> {
  await tx.stockMovement.create({
    data: {
      variantId: input.variantId,
      variantIdSnapshot: input.variantIdSnapshot,
      skuSnapshot: input.skuSnapshot,
      delta: input.delta,
      reason: input.reason,
      orderId: input.orderId ?? null,
      actorUserId: context.actorUserId,
      resultingBalance: input.resultingBalance,
      correlationId: context.requestId,
      metadata: input.metadata,
    },
  });
}
