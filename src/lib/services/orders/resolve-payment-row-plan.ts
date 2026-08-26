import { AppError } from "@/lib/errors/app-error";
import type { MachineChange } from "./order-transition.types";
import type { PaymentStatus } from "./payment-status";
import type { PaymentRow } from "./payment-row";
import { planPaymentRowChange } from "./plan-payment-row";

export interface ResolvedPaymentRowPlan {
  paymentId: string;
  rowChange: MachineChange<PaymentStatus>;
  previousPaymentStatus: string;
}

/**
 * Requires a latest Payment and a valid payment-row FSM plan when admin/API
 * requests a paymentStatus change. Missing payment is a conflict, not a skip.
 */
export function resolveRequestedPaymentRowPlan(input: {
  latestPayment: PaymentRow | null;
  orderPaymentPlan: MachineChange<PaymentStatus>;
}): ResolvedPaymentRowPlan {
  if (!input.latestPayment) {
    throw AppError.conflict("Order has no payment record.");
  }

  const rowChange = planPaymentRowChange(
    input.latestPayment.status,
    input.orderPaymentPlan.to,
  );

  return {
    paymentId: input.latestPayment.id,
    rowChange,
    previousPaymentStatus: input.latestPayment.status,
  };
}

export function isMachineWrite(change: MachineChange<string>): boolean {
  return change.kind === "apply" || change.kind === "normalize";
}
