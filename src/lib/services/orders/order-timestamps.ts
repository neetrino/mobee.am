import type { FulfillmentStatus } from "./fulfillment-status";
import type { LockedOrderRow, MachineChange } from "./order-transition.types";
import type { OrderStatus } from "./order-status";
import type { PaymentStatus } from "./payment-status";

export interface OrderTimestampPatch {
  paidAt?: Date;
  fulfilledAt?: Date;
  cancelledAt?: Date;
}

function isWrite(change: MachineChange<string>): boolean {
  return change.kind === "apply" || change.kind === "normalize";
}

export function buildOrderTimestampPatch(input: {
  locked: LockedOrderRow;
  now: Date;
  order: MachineChange<OrderStatus>;
  payment: MachineChange<PaymentStatus>;
  fulfillment: MachineChange<FulfillmentStatus>;
}): OrderTimestampPatch {
  const patch: OrderTimestampPatch = {};

  if (isWrite(input.payment) && input.payment.to === "paid" && input.locked.paidAt === null) {
    patch.paidAt = input.now;
  }

  if (isWrite(input.order) && input.order.to === "cancelled" && input.locked.cancelledAt === null) {
    patch.cancelledAt = input.now;
  }

  if (
    isWrite(input.fulfillment) &&
    input.locked.fulfilledAt === null &&
    (input.fulfillment.to === "fulfilled" ||
      input.fulfillment.to === "shipped" ||
      input.fulfillment.to === "delivered")
  ) {
    patch.fulfilledAt = input.now;
  }

  return patch;
}
