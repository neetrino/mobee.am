import { Prisma } from "@white-shop/db";
import type { PaymentStatus } from "./payment-status";

export interface PaymentRow {
  id: string;
  status: string;
  createdAt: Date;
}

export async function findLatestPayment(
  tx: Prisma.TransactionClient,
  orderId: string,
): Promise<PaymentRow | null> {
  const rows = await tx.payment.findMany({
    where: { orderId },
    select: { id: true, status: true, createdAt: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 1,
  });
  return rows[0] ?? null;
}

export async function findPaymentByIdForOrder(
  tx: Prisma.TransactionClient,
  paymentId: string,
  orderId: string,
): Promise<PaymentRow | null> {
  const payment = await tx.payment.findFirst({
    where: { id: paymentId, orderId },
    select: { id: true, status: true, createdAt: true },
  });
  return payment;
}

export async function updatePaymentStatus(
  tx: Prisma.TransactionClient,
  input: {
    paymentId: string;
    fromStatus: string;
    toStatus: PaymentStatus;
    now: Date;
    providerResponse?: Prisma.InputJsonValue;
  },
): Promise<void> {
  const data: Prisma.PaymentUpdateInput = {
    status: input.toStatus,
  };

  if (input.toStatus === "paid" && input.fromStatus !== "paid") {
    data.completedAt = input.now;
    data.failedAt = null;
  }
  if (input.toStatus === "failed" && input.fromStatus !== "failed") {
    data.failedAt = input.now;
  }
  if (input.providerResponse !== undefined) {
    data.providerResponse = input.providerResponse;
  }

  await tx.payment.update({
    where: { id: input.paymentId },
    data,
  });
}
