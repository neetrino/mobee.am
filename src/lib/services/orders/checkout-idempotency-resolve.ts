import { db } from "@white-shop/db";
import { Prisma } from "@white-shop/db";
import {
  assertIdempotencyFingerprintMatch,
  isOrderIdempotencyUniqueConflict,
} from "./checkout-idempotency";

const REPLAY_PAYMENT_INCLUDE = {
  orderBy: { createdAt: "desc" as const },
  take: 1,
};

export async function findOrderByIdempotencyKey(
  tx: Prisma.TransactionClient,
  scopeHash: string,
  keyHash: string,
) {
  return tx.order.findFirst({
    where: {
      idempotencyScopeHash: scopeHash,
      idempotencyKeyHash: keyHash,
    },
    include: {
      items: true,
      payments: REPLAY_PAYMENT_INCLUDE,
    },
  });
}

export async function preflightCheckoutIdempotency(input: {
  scopeHash: string;
  keyHash: string;
  requestFingerprint: string;
}) {
  const existing = await db.order.findFirst({
    where: {
      idempotencyScopeHash: input.scopeHash,
      idempotencyKeyHash: input.keyHash,
    },
    include: {
      payments: REPLAY_PAYMENT_INCLUDE,
    },
  });
  if (!existing) {
    return null;
  }
  assertIdempotencyFingerprintMatch(existing.requestFingerprint, input.requestFingerprint);
  const payment = existing.payments[0];
  if (!payment) {
    throw new Error("Idempotent checkout order is missing payment");
  }
  return { order: existing, payment, replay: true as const };
}

export async function rollbackOrderNumberSavepoint(tx: Prisma.TransactionClient): Promise<void> {
  try {
    await tx.$executeRaw(Prisma.sql`ROLLBACK TO SAVEPOINT order_number_alloc`);
  } catch {
    // Savepoint may be absent when failure happened outside order-number allocation.
  }
}

export async function resolveIdempotencyAfterUniqueConflict(input: {
  tx: Prisma.TransactionClient;
  scopeHash: string;
  keyHash: string;
  requestFingerprint: string;
}) {
  await rollbackOrderNumberSavepoint(input.tx);
  const existing = await findOrderByIdempotencyKey(input.tx, input.scopeHash, input.keyHash);
  if (!existing) {
    throw new Error("Idempotency unique conflict without existing order");
  }
  assertIdempotencyFingerprintMatch(existing.requestFingerprint, input.requestFingerprint);
  const payment = existing.payments[0];
  if (!payment) {
    throw new Error("Idempotent checkout order is missing payment");
  }
  return { order: existing, payment, replay: true as const };
}

export async function tryReplayExistingCheckout(input: {
  tx: Prisma.TransactionClient;
  scopeHash: string;
  keyHash: string;
  requestFingerprint: string;
}) {
  const existing = await findOrderByIdempotencyKey(input.tx, input.scopeHash, input.keyHash);
  if (!existing) {
    return null;
  }
  assertIdempotencyFingerprintMatch(existing.requestFingerprint, input.requestFingerprint);
  const payment = existing.payments[0];
  if (!payment) {
    throw new Error("Idempotent checkout order is missing payment");
  }
  return { order: existing, payment, replay: true as const };
}

export { isOrderIdempotencyUniqueConflict };
