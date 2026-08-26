import { Prisma } from "@white-shop/db";
import { restockCancelledOrder } from "../inventory/cancel-restock";
import type {
  CommerceRequestContext,
  LockedOrderRow,
  MachineChange,
  PlannedOrderTransitions,
  RestockSkip,
} from "./order-transition.types";
import { buildOrderTimestampPatch } from "./order-timestamps";
import { updatePaymentStatus } from "./payment-row";
import { isMachineWrite } from "./resolve-payment-row-plan";
import { writeTransitionHistory } from "./write-transition-history";
import type { PaymentStatus } from "./payment-status";

async function applyCancelRestock(input: {
  tx: Prisma.TransactionClient;
  context: CommerceRequestContext;
  orderId: string;
  planned: PlannedOrderTransitions;
}): Promise<RestockSkip[]> {
  if (!input.planned.isCancelRestock) {
    return [];
  }

  const items = await input.tx.orderItem.findMany({
    where: { orderId: input.orderId },
    select: { variantId: true, sku: true, quantity: true },
  });
  return restockCancelledOrder({
    tx: input.tx,
    context: input.context,
    orderId: input.orderId,
    items,
  });
}

function orderWriteData(input: {
  planned: PlannedOrderTransitions;
  timestamps: ReturnType<typeof buildOrderTimestampPatch>;
}): Prisma.OrderUpdateInput {
  return {
    ...(isMachineWrite(input.planned.order) ? { status: input.planned.order.to } : {}),
    ...(isMachineWrite(input.planned.payment)
      ? { paymentStatus: input.planned.payment.to }
      : {}),
    ...(isMachineWrite(input.planned.fulfillment)
      ? { fulfillmentStatus: input.planned.fulfillment.to }
      : {}),
    ...input.timestamps,
  };
}

async function applyPaymentRowWrite(input: {
  tx: Prisma.TransactionClient;
  paymentId?: string | null;
  paymentRowChange?: MachineChange<PaymentStatus>;
  now: Date;
  providerResponse?: Prisma.InputJsonValue;
}): Promise<void> {
  if (!input.paymentId || !input.paymentRowChange || !isMachineWrite(input.paymentRowChange)) {
    return;
  }

  await updatePaymentStatus(input.tx, {
    paymentId: input.paymentId,
    fromStatus: input.paymentRowChange.fromStored,
    toStatus: input.paymentRowChange.to,
    now: input.now,
    providerResponse: input.providerResponse,
  });
}

export async function applyPlannedTransitions(input: {
  tx: Prisma.TransactionClient;
  context: CommerceRequestContext;
  locked: LockedOrderRow;
  planned: PlannedOrderTransitions;
  paymentId?: string | null;
  paymentRowChange?: MachineChange<PaymentStatus>;
  providerResponse?: Prisma.InputJsonValue;
  provider?: string | null;
  providerEventId?: string | null;
}): Promise<void> {
  const now = new Date();
  const timestamps = buildOrderTimestampPatch({
    locked: input.locked,
    now,
    order: input.planned.order,
    payment: input.planned.payment,
    fulfillment: input.planned.fulfillment,
  });
  const orderData = orderWriteData({ planned: input.planned, timestamps });
  if (Object.keys(orderData).length > 0) {
    await input.tx.order.update({
      where: { id: input.locked.id },
      data: orderData,
    });
  }

  await applyPaymentRowWrite({
    tx: input.tx,
    paymentId: input.paymentId,
    paymentRowChange: input.paymentRowChange,
    now,
    providerResponse: input.providerResponse,
  });

  const restockSkipped = await applyCancelRestock({
    tx: input.tx,
    context: input.context,
    orderId: input.locked.id,
    planned: input.planned,
  });

  await writeTransitionHistory({
    tx: input.tx,
    context: input.context,
    orderId: input.locked.id,
    planned: input.planned,
    paymentRowChange: input.paymentRowChange,
    paymentId: input.paymentId,
    provider: input.provider,
    providerEventId: input.providerEventId,
    restockSkipped: input.planned.isCancelRestock ? restockSkipped : undefined,
    before: {
      status: input.locked.status,
      paymentStatus: input.locked.paymentStatus,
      fulfillmentStatus: input.locked.fulfillmentStatus,
    },
  });
}
