import { db } from "@white-shop/db";
import { Prisma } from "@white-shop/db";
import { AppError } from "@/lib/errors/app-error";
import { ORDER_TX_MAX_WAIT_MS, ORDER_TX_TIMEOUT_MS } from "./order-fsm.constants";
import { applyPlannedTransitions } from "./apply-order-transitions";
import { lockOrderForUpdate } from "./lock-order";
import { findLatestPayment, findPaymentByIdForOrder } from "./payment-row";
import { planOrderTransitions } from "./plan-order-transitions";
import { planPaymentRowChange } from "./plan-payment-row";
import { buildProviderEventId } from "./provider-event-id";
import { isMachineWrite } from "./resolve-payment-row-plan";
import type { CommerceRequestContext } from "./order-transition.types";
import type { PaymentStatus } from "./payment-status";

export interface PaymentCallbackInput {
  paymentId: string;
  orderNumber: string;
  status: Extract<PaymentStatus, "paid" | "failed">;
  provider: string;
}

function callbackProviderResponse(status: string, provider: string): Prisma.InputJsonValue {
  return {
    callbackStatus: status,
    provider,
    receivedAt: new Date().toISOString(),
  };
}

async function loadCallbackPayment(
  tx: Prisma.TransactionClient,
  input: PaymentCallbackInput,
  orderId: string,
) {
  const payment = await findPaymentByIdForOrder(tx, input.paymentId, orderId);
  if (!payment) {
    throw AppError.notFound("Payment not found");
  }
  return payment;
}

async function assertCurrentPaymentAttempt(
  tx: Prisma.TransactionClient,
  orderId: string,
  paymentId: string,
): Promise<void> {
  const latest = await findLatestPayment(tx, orderId);
  if (!latest || latest.id !== paymentId) {
    throw AppError.conflict("Payment callback does not match the current payment attempt.");
  }
}

async function findExistingProviderReplayEvent(
  tx: Prisma.TransactionClient,
  provider: string,
  providerEventId: string,
) {
  return tx.orderEvent.findFirst({
    where: {
      provider,
      providerEventId,
    },
    select: { id: true },
  });
}

/**
 * Applies a provider callback to the specific Payment row and, when current, Order.paymentStatus.
 * Does not change Order.status. Stale attempts return 409 without writes.
 */
export async function applyPaymentCallback(
  input: PaymentCallbackInput,
  context: CommerceRequestContext,
): Promise<"applied" | "no_op"> {
  const providerEventId = buildProviderEventId(input);

  return db.$transaction(
    async (tx) => {
      const replayBeforeLock = await findExistingProviderReplayEvent(
        tx,
        input.provider,
        providerEventId,
      );
      if (replayBeforeLock) {
        return "no_op";
      }

      const existing = await tx.payment.findUnique({
        where: { id: input.paymentId },
        select: { id: true, orderId: true, order: { select: { id: true, number: true } } },
      });
      if (!existing || existing.order.number !== input.orderNumber) {
        throw AppError.notFound("Payment not found");
      }

      const locked = await lockOrderForUpdate(tx, existing.orderId);
      if (!locked || locked.number !== input.orderNumber) {
        throw AppError.notFound("Payment not found");
      }

      const replayAfterLock = await findExistingProviderReplayEvent(
        tx,
        input.provider,
        providerEventId,
      );
      if (replayAfterLock) {
        return "no_op";
      }

      const payment = await loadCallbackPayment(tx, input, locked.id);
      await assertCurrentPaymentAttempt(tx, locked.id, payment.id);

      const orderPlan = planOrderTransitions(locked, { paymentStatus: input.status });
      const rowChange = planPaymentRowChange(payment.status, input.status);
      if (!isMachineWrite(orderPlan.payment) && !isMachineWrite(rowChange)) {
        return "no_op";
      }

      await applyPlannedTransitions({
        tx,
        context,
        locked,
        planned: orderPlan,
        paymentId: payment.id,
        paymentRowChange: rowChange,
        providerResponse: callbackProviderResponse(input.status, input.provider),
        provider: input.provider,
        providerEventId,
      });
      return "applied";
    },
    { timeout: ORDER_TX_TIMEOUT_MS, maxWait: ORDER_TX_MAX_WAIT_MS },
  );
}
