import { db } from "@white-shop/db";
import { Prisma } from "@white-shop/db";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/utils/logger";
import { createAuditLog } from "../audit/write-audit-log";
import {
  AUDIT_ACTION,
  AUDIT_TARGET,
  ORDER_TX_MAX_WAIT_MS,
  ORDER_TX_TIMEOUT_MS,
} from "./order-fsm.constants";
import { lockOrderForUpdate } from "./lock-order";
import type { CommerceRequestContext, LockedOrderRow } from "./order-transition.types";

function commerceDeleteConflict(counts: { items: number; payments: number; stockMovements: number }): never {
  if (counts.items > 0 || counts.payments > 0) {
    throw AppError.conflict(
      "Order with items or payments cannot be deleted. Cancel the order instead.",
    );
  }
  throw AppError.conflict("Order has inventory history and cannot be deleted.");
}

async function loadLockedDeleteCounts(tx: Prisma.TransactionClient, orderId: string) {
  return tx.order.findUnique({
    where: { id: orderId },
    select: {
      _count: {
        select: { items: true, payments: true, stockMovements: true },
      },
    },
  });
}

async function writeDeleteAudit(
  tx: Prisma.TransactionClient,
  context: CommerceRequestContext,
  locked: LockedOrderRow,
): Promise<void> {
  await createAuditLog(tx, context, {
    action: AUDIT_ACTION.ORDER_DELETE_EMPTY,
    targetType: AUDIT_TARGET.ORDER,
    targetId: locked.id,
    beforeDiff: {
      number: locked.number,
      status: locked.status,
      paymentStatus: locked.paymentStatus,
      fulfillmentStatus: locked.fulfillmentStatus,
    },
    afterDiff: { deleted: true },
  });
}

/**
 * Hard-deletes an empty test order inside one locked transaction with an audit row.
 */
export async function deleteEmptyOrder(
  orderId: string,
  context: CommerceRequestContext,
): Promise<{ success: true }> {
  return db.$transaction(
    async (tx) => {
      const locked = await lockOrderForUpdate(tx, orderId);
      if (!locked) {
        throw AppError.notFound(`Order with id '${orderId}' does not exist`);
      }

      const counts = await loadLockedDeleteCounts(tx, orderId);
      if (!counts) {
        throw AppError.notFound(`Order with id '${orderId}' does not exist`);
      }

      const { items, payments, stockMovements } = counts._count;
      if (items > 0 || payments > 0 || stockMovements > 0) {
        commerceDeleteConflict({ items, payments, stockMovements });
      }

      await writeDeleteAudit(tx, context, locked);
      await tx.order.delete({ where: { id: orderId } });
      logger.info("Empty test order deleted", {
        orderId,
        orderNumber: locked.number,
        requestId: context.requestId,
      });
      return { success: true };
    },
    { timeout: ORDER_TX_TIMEOUT_MS, maxWait: ORDER_TX_MAX_WAIT_MS },
  );
}
