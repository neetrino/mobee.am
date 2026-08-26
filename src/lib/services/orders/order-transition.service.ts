import { db } from "@white-shop/db";
import { Prisma } from "@white-shop/db";
import { AppError } from "@/lib/errors/app-error";
import { ORDER_TX_MAX_WAIT_MS, ORDER_TX_TIMEOUT_MS } from "./order-fsm.constants";
import { applyPlannedTransitions } from "./apply-order-transitions";
import { lockOrderForUpdate } from "./lock-order";
import { findLatestPayment } from "./payment-row";
import { planOrderTransitions } from "./plan-order-transitions";
import {
  isMachineWrite,
  resolveRequestedPaymentRowPlan,
  type ResolvedPaymentRowPlan,
} from "./resolve-payment-row-plan";
import type { CommerceRequestContext } from "./order-transition.types";

const ORDER_INCLUDE = {
  items: true,
  payments: true,
} as const;

export interface UpdateOrderStatusesInput {
  status?: string;
  paymentStatus?: string;
  fulfillmentStatus?: string;
}

async function loadOrderResult(tx: Prisma.TransactionClient, orderId: string) {
  return tx.order.findUnique({
    where: { id: orderId },
    include: ORDER_INCLUDE,
  });
}

async function planRequestedPaymentRow(
  tx: Prisma.TransactionClient,
  orderId: string,
  data: UpdateOrderStatusesInput,
  planned: ReturnType<typeof planOrderTransitions>,
): Promise<ResolvedPaymentRowPlan | null> {
  if (data.paymentStatus === undefined) {
    return null;
  }

  const latestPayment = await findLatestPayment(tx, orderId);
  return resolveRequestedPaymentRowPlan({
    latestPayment,
    orderPaymentPlan: planned.payment,
  });
}

/**
 * Applies admin/API status changes through one locked transaction and the domain FSM.
 * PaymentStatus requests validate Order and Payment row machines together.
 */
export async function updateOrderStatuses(
  orderId: string,
  data: UpdateOrderStatusesInput,
  context: CommerceRequestContext,
) {
  return db.$transaction(
    async (tx) => {
      const locked = await lockOrderForUpdate(tx, orderId);
      if (!locked) {
        throw AppError.notFound(`Order with id '${orderId}' does not exist`);
      }

      const planned = planOrderTransitions(locked, data);
      const paymentRowPlan = await planRequestedPaymentRow(tx, orderId, data, planned);
      const rowWrite = paymentRowPlan != null && isMachineWrite(paymentRowPlan.rowChange);
      if (planned.kind === "no_op" && !rowWrite) {
        return loadOrderResult(tx, orderId);
      }

      await applyPlannedTransitions({
        tx,
        context,
        locked,
        planned,
        paymentId: paymentRowPlan?.paymentId ?? null,
        paymentRowChange: paymentRowPlan?.rowChange,
      });

      return loadOrderResult(tx, orderId);
    },
    { timeout: ORDER_TX_TIMEOUT_MS, maxWait: ORDER_TX_MAX_WAIT_MS },
  );
}
