import { Prisma } from "@white-shop/db";
import type { CommerceRequestContext } from "../orders/order-transition.types";

export interface AuditLogWrite {
  action: string;
  targetType: string;
  targetId: string | null;
  beforeDiff?: Prisma.InputJsonValue;
  afterDiff?: Prisma.InputJsonValue;
  context?: Prisma.InputJsonValue;
}

/**
 * Writes one AuditLog row inside the caller transaction.
 * `requestId` and `correlationId` both come from the request context.
 */
export async function createAuditLog(
  tx: Prisma.TransactionClient,
  context: CommerceRequestContext,
  input: AuditLogWrite,
): Promise<void> {
  await tx.auditLog.create({
    data: {
      actorUserId: context.actorUserId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      beforeDiff: input.beforeDiff,
      afterDiff: input.afterDiff,
      requestId: context.requestId,
      correlationId: context.requestId,
      context: input.context,
    },
  });
}
