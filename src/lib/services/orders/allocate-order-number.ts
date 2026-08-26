import { Prisma } from "@white-shop/db";

export const ORDER_NUMBER_START = 1000;
export const ORDER_NUMBER_ALLOCATE_ATTEMPTS = 8;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function targetMentionsNumber(target: unknown): boolean {
  if (Array.isArray(target)) {
    return target.some((item) => item === "number");
  }
  if (typeof target === "string") {
    return target.includes("number");
  }
  return false;
}

/**
 * True when Prisma reports a unique conflict on `orders.number`.
 */
export function isOrderNumberUniqueConflict(error: unknown): boolean {
  if (!isRecord(error) || error.code !== "P2002") {
    return false;
  }

  const meta = isRecord(error.meta) ? error.meta : null;
  if (targetMentionsNumber(meta?.target)) {
    return true;
  }

  const message = typeof error.message === "string" ? error.message : "";
  return /unique constraint failed on the fields: \(`number`\)/i.test(message);
}

/**
 * Reads MAX(numeric number)+1 without an advisory lock.
 * Unique `orders.number` plus bounded retry handles the remaining race.
 */
export async function peekNextNumericOrderNumber(
  tx: Prisma.TransactionClient,
): Promise<string> {
  const rows = await tx.$queryRaw<Array<{ max: bigint | null }>>(
    Prisma.sql`SELECT MAX(CAST("number" AS BIGINT)) AS max FROM "orders" WHERE "number" ~ '^[0-9]+$'`,
  );
  const currentMax = Number(rows[0]?.max ?? 0);
  return String(Math.max(currentMax + 1, ORDER_NUMBER_START));
}

/**
 * Allocates a unique numeric order number inside the current transaction.
 * PostgreSQL aborts a transaction on unique_violation; a SAVEPOINT lets MAX+1
 * retry without rolling back later stock writes (which have not run yet).
 */
export async function createOrderWithUniqueNumber<T>(
  tx: Prisma.TransactionClient,
  create: (orderNumber: string) => Promise<T>,
): Promise<T> {
  await tx.$executeRaw(Prisma.sql`SAVEPOINT order_number_alloc`);
  let lastError: unknown;

  for (let attempt = 1; attempt <= ORDER_NUMBER_ALLOCATE_ATTEMPTS; attempt += 1) {
    const orderNumber = await peekNextNumericOrderNumber(tx);
    try {
      const created = await create(orderNumber);
      await tx.$executeRaw(Prisma.sql`RELEASE SAVEPOINT order_number_alloc`);
      return created;
    } catch (error) {
      lastError = error;
      const canRetry =
        isOrderNumberUniqueConflict(error) && attempt < ORDER_NUMBER_ALLOCATE_ATTEMPTS;
      if (!canRetry) {
        throw error;
      }
      await tx.$executeRaw(Prisma.sql`ROLLBACK TO SAVEPOINT order_number_alloc`);
    }
  }

  throw lastError;
}
