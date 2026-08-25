import { Prisma } from "@white-shop/db";
import { AUDIT_ACTION, AUDIT_TARGET, ORDER_EVENT_TYPE } from "./order-fsm.constants";
import type {
  CommerceRequestContext,
  MachineChange,
  PlannedOrderTransitions,
  RestockSkip,
} from "./order-transition.types";
import { createAuditLog } from "../audit/write-audit-log";
import { createOrderEvent } from "./write-order-event";
import { isMachineWrite } from "./resolve-payment-row-plan";
import type { PaymentStatus } from "./payment-status";

function restockSkippedJson(skipped: RestockSkip[]): Prisma.InputJsonValue {
  return skipped.map((row) => ({
    variantId: row.variantId,
    skuSnapshot: row.skuSnapshot,
    quantity: row.quantity,
    reason: row.reason,
  }));
}

async function writeMachineEvent(input: {
  tx: Prisma.TransactionClient;
  context: CommerceRequestContext;
  orderId: string;
  type: string;
  change: MachineChange<string>;
  extraData?: Prisma.InputJsonValue;
}): Promise<void> {
  if (!isMachineWrite(input.change)) {
    return;
  }

  await createOrderEvent(input.tx, input.context, {
    orderId: input.orderId,
    type: input.type,
    fromState: input.change.fromStored,
    toState: input.change.to,
    isCustomerVisible: true,
    data: {
      source: input.context.source,
      note: input.context.note ?? null,
      normalization: input.change.kind === "normalize",
      ...(input.extraData && typeof input.extraData === "object" ? input.extraData : {}),
    },
  });
}

async function writePaymentHistory(input: {
  tx: Prisma.TransactionClient;
  context: CommerceRequestContext;
  orderId: string;
  orderPayment: MachineChange<PaymentStatus>;
  paymentRowChange?: MachineChange<PaymentStatus>;
  paymentId?: string | null;
}): Promise<void> {
  const orderWrite = isMachineWrite(input.orderPayment);
  const rowWrite = input.paymentRowChange ? isMachineWrite(input.paymentRowChange) : false;
  if (!orderWrite && !rowWrite) {
    return;
  }

  const previousOrderPaymentStatus = input.orderPayment.fromStored;
  const previousPaymentStatus = input.paymentRowChange?.fromStored ?? previousOrderPaymentStatus;
  const target = input.orderPayment.to;
  const fromState = rowWrite && input.paymentRowChange
    ? input.paymentRowChange.fromStored
    : input.orderPayment.fromStored;

  await createOrderEvent(input.tx, input.context, {
    orderId: input.orderId,
    type: ORDER_EVENT_TYPE.PAYMENT_STATUS,
    fromState,
    toState: target,
    isCustomerVisible: true,
    data: {
      source: input.context.source,
      note: input.context.note ?? null,
      normalization: input.orderPayment.kind === "normalize",
      previousOrderPaymentStatus,
      previousPaymentStatus,
      target,
      reconciliation: previousOrderPaymentStatus !== previousPaymentStatus,
      paymentId: input.paymentId ?? null,
    },
  });
}

function auditAfterDiff(
  planned: PlannedOrderTransitions,
  restockSkipped?: RestockSkip[],
): Prisma.InputJsonValue {
  if (!planned.isCancelRestock) {
    return planned.final;
  }
  return {
    ...planned.final,
    restockSkipped: restockSkippedJson(restockSkipped ?? []),
  };
}

function auditContextJson(
  note: string | null,
  planned: PlannedOrderTransitions,
  restockSkipped?: RestockSkip[],
): Prisma.InputJsonValue {
  if (!planned.isCancelRestock) {
    return { note };
  }
  return { note, restockSkipped: restockSkippedJson(restockSkipped ?? []) };
}

function auditBeforeDiff(input: {
  before: { status: string; paymentStatus: string; fulfillmentStatus: string };
  previousPaymentRowStatus?: string;
}) {
  if (input.previousPaymentRowStatus === undefined) {
    return input.before;
  }
  return { ...input.before, paymentRowStatus: input.previousPaymentRowStatus };
}

export async function writeTransitionHistory(input: {
  tx: Prisma.TransactionClient;
  context: CommerceRequestContext;
  orderId: string;
  planned: PlannedOrderTransitions;
  restockSkipped?: RestockSkip[];
  paymentRowChange?: MachineChange<PaymentStatus>;
  paymentId?: string | null;
  before: { status: string; paymentStatus: string; fulfillmentStatus: string };
}): Promise<void> {
  await writeMachineEvent({
    tx: input.tx,
    context: input.context,
    orderId: input.orderId,
    type: ORDER_EVENT_TYPE.ORDER_STATUS,
    change: input.planned.order,
    extraData: input.restockSkipped
      ? ({
          restockSkipped: restockSkippedJson(
            input.planned.isCancelRestock ? input.restockSkipped : [],
          ),
        } satisfies Prisma.InputJsonObject)
      : undefined,
  });
  await writePaymentHistory({
    tx: input.tx,
    context: input.context,
    orderId: input.orderId,
    orderPayment: input.planned.payment,
    paymentRowChange: input.paymentRowChange,
    paymentId: input.paymentId,
  });
  await writeMachineEvent({
    tx: input.tx,
    context: input.context,
    orderId: input.orderId,
    type: ORDER_EVENT_TYPE.FULFILLMENT_STATUS,
    change: input.planned.fulfillment,
  });

  if (input.context.source !== "admin") {
    return;
  }

  await createAuditLog(input.tx, input.context, {
    action: AUDIT_ACTION.ORDER_UPDATE,
    targetType: AUDIT_TARGET.ORDER,
    targetId: input.orderId,
    beforeDiff: auditBeforeDiff({
      before: input.before,
      previousPaymentRowStatus: input.paymentRowChange?.fromStored,
    }),
    afterDiff: auditAfterDiff(input.planned, input.restockSkipped),
    context: auditContextJson(
      input.context.note ?? null,
      input.planned,
      input.restockSkipped,
    ),
  });
}
