import { AppError } from "@/lib/errors/app-error";
import {
  canTransitionPaymentStatus,
  isPaymentStatus,
  type PaymentStatus,
} from "./payment-status";
import type { MachineChange } from "./order-transition.types";

/**
 * Plans a payment-row FSM change. Same-state is a no-op; invalid current/target is conflict.
 */
export function planPaymentRowChange(
  stored: string,
  requested: PaymentStatus,
): MachineChange<PaymentStatus> {
  if (!isPaymentStatus(stored)) {
    throw AppError.conflict("Payment has an invalid current status.");
  }

  if (stored === requested) {
    return {
      kind: "no_op",
      fromStored: stored,
      fromCanonical: stored,
      to: requested,
    };
  }

  if (!canTransitionPaymentStatus(stored, requested)) {
    throw AppError.conflict(`Cannot change payment from ${stored} to ${requested}.`);
  }

  return {
    kind: "apply",
    fromStored: stored,
    fromCanonical: stored,
    to: requested,
  };
}
