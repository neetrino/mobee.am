import { Prisma } from "@white-shop/db";
import type { LockedOrderRow } from "./order-transition.types";

export async function lockOrderForUpdate(
  tx: Prisma.TransactionClient,
  orderId: string,
): Promise<LockedOrderRow | null> {
  const rows = await tx.$queryRaw<LockedOrderRow[]>(
    Prisma.sql`SELECT id, number, status, "paymentStatus", "fulfillmentStatus",
                      "paidAt", "fulfilledAt", "cancelledAt"
               FROM "orders"
               WHERE id = ${orderId}
               FOR UPDATE`,
  );
  return rows[0] ?? null;
}

export async function lockOrderByNumber(
  tx: Prisma.TransactionClient,
  orderNumber: string,
): Promise<LockedOrderRow | null> {
  const rows = await tx.$queryRaw<LockedOrderRow[]>(
    Prisma.sql`SELECT id, number, status, "paymentStatus", "fulfillmentStatus",
                      "paidAt", "fulfilledAt", "cancelledAt"
               FROM "orders"
               WHERE number = ${orderNumber}
               FOR UPDATE`,
  );
  return rows[0] ?? null;
}
