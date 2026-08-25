import { AppError } from "@/lib/errors/app-error";
import { assertCrossStateInvariants } from "./cross-state";
import {
  canTransitionFulfillmentStatus,
  fulfillmentStatusListDetail,
  isFulfillmentStatus,
} from "./fulfillment-status";
import {
  canonicalizeOrderStatus,
  canTransitionOrderStatus,
  isLegacyConfirmedOrderStatus,
  isOrderStatus,
  orderStatusListDetail,
  type OrderStatus,
} from "./order-status";
import {
  canTransitionPaymentStatus,
  isPaymentStatus,
  paymentStatusListDetail,
} from "./payment-status";
import type { MachineChange, PlannedOrderTransitions } from "./order-transition.types";

export interface RequestedOrderFields {
  status?: string;
  paymentStatus?: string;
  fulfillmentStatus?: string;
}

export interface StoredOrderStates {
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
}

function invalidValue(field: string, allowed: string): never {
  throw AppError.badRequest(`Invalid ${field}. Must be one of: ${allowed}`);
}

function invalidCurrent(field: string): never {
  throw AppError.conflict(`Order has an invalid current ${field}.`);
}

function invalidTransition(machine: string, from: string, to: string): never {
  throw AppError.conflict(`Cannot change ${machine} from ${from} to ${to}.`);
}

function planMachine<TStatus extends string>(input: {
  machine: string;
  stored: string;
  requested: string | undefined;
  canonicalFrom: TStatus | null;
  parseRequested: (value: string) => value is TStatus;
  allowedDetail: string;
  canTransition: (from: TStatus, to: TStatus) => boolean;
  normalize?: boolean;
}): MachineChange<TStatus> {
  if (input.canonicalFrom === null) {
    invalidCurrent(input.machine);
  }

  if (input.requested === undefined) {
    return {
      kind: "no_op",
      fromStored: input.stored,
      fromCanonical: input.canonicalFrom,
      to: input.canonicalFrom,
    };
  }

  if (!input.parseRequested(input.requested)) {
    invalidValue(input.machine, input.allowedDetail);
  }

  if (input.normalize) {
    return {
      kind: "normalize",
      fromStored: input.stored,
      fromCanonical: input.canonicalFrom,
      to: input.requested,
    };
  }

  if (input.canonicalFrom === input.requested) {
    return {
      kind: "no_op",
      fromStored: input.stored,
      fromCanonical: input.canonicalFrom,
      to: input.requested,
    };
  }

  if (!input.canTransition(input.canonicalFrom, input.requested)) {
    invalidTransition(input.machine, input.stored, input.requested);
  }

  return {
    kind: "apply",
    fromStored: input.stored,
    fromCanonical: input.canonicalFrom,
    to: input.requested,
  };
}

function planOrderMachine(
  stored: string,
  requested: string | undefined,
): MachineChange<OrderStatus> {
  const canonicalFrom = canonicalizeOrderStatus(stored);
  const isLegacyConfirmed = isLegacyConfirmedOrderStatus(stored);
  const normalizeToProcessing =
    isLegacyConfirmed && requested === "processing";

  if (requested !== undefined && isLegacyConfirmedOrderStatus(requested)) {
    invalidValue("status", orderStatusListDetail());
  }

  return planMachine({
    machine: "status",
    stored,
    requested,
    canonicalFrom,
    parseRequested: isOrderStatus,
    allowedDetail: orderStatusListDetail(),
    canTransition: canTransitionOrderStatus,
    normalize: normalizeToProcessing,
  });
}

function hasWrite(change: MachineChange<string>): boolean {
  return change.kind === "apply" || change.kind === "normalize";
}

/**
 * Plans order/payment/fulfillment writes from locked stored state.
 * Same-state canonical updates are no-ops; `confirmed → processing` is normalization.
 */
export function planOrderTransitions(
  stored: StoredOrderStates,
  requested: RequestedOrderFields,
): PlannedOrderTransitions {
  const order = planOrderMachine(stored.status, requested.status);
  const payment = planMachine({
    machine: "paymentStatus",
    stored: stored.paymentStatus,
    requested: requested.paymentStatus,
    canonicalFrom: isPaymentStatus(stored.paymentStatus) ? stored.paymentStatus : null,
    parseRequested: isPaymentStatus,
    allowedDetail: paymentStatusListDetail(),
    canTransition: canTransitionPaymentStatus,
  });
  const fulfillment = planMachine({
    machine: "fulfillmentStatus",
    stored: stored.fulfillmentStatus,
    requested: requested.fulfillmentStatus,
    canonicalFrom: isFulfillmentStatus(stored.fulfillmentStatus)
      ? stored.fulfillmentStatus
      : null,
    parseRequested: isFulfillmentStatus,
    allowedDetail: fulfillmentStatusListDetail(),
    canTransition: canTransitionFulfillmentStatus,
  });

  const final = {
    status: order.to,
    paymentStatus: payment.to,
    fulfillmentStatus: fulfillment.to,
  };

  assertCrossStateInvariants({
    current: {
      status: order.fromCanonical,
      fulfillmentStatus: fulfillment.fromCanonical,
    },
    final: {
      status: final.status,
      fulfillmentStatus: final.fulfillmentStatus,
    },
    fulfillmentChanging: hasWrite(fulfillment),
  });

  const isCancelRestock = hasWrite(order) && order.to === "cancelled";
  const kind = hasWrite(order) || hasWrite(payment) || hasWrite(fulfillment) ? "apply" : "no_op";

  return { kind, order, payment, fulfillment, final, isCancelRestock };
}
