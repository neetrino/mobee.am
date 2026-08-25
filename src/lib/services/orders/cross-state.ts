import { AppError } from "@/lib/errors/app-error";
import type { FulfillmentStatus } from "./fulfillment-status";
import type { OrderStatus } from "./order-status";

export interface CrossStateSnapshot {
  status: OrderStatus;
  fulfillmentStatus: FulfillmentStatus;
}

/**
 * Validates the resulting combination of order and fulfillment states.
 * Payment is independent (COD may complete unpaid; refund never restocks).
 */
export function assertCrossStateInvariants(input: {
  current: CrossStateSnapshot;
  final: CrossStateSnapshot;
  fulfillmentChanging: boolean;
}): void {
  if (input.current.status === "cancelled" && input.fulfillmentChanging) {
    throw AppError.conflict("Cancelled orders cannot change fulfillment status.");
  }

  if (input.final.status === "cancelled" && input.fulfillmentChanging) {
    throw AppError.conflict("Cancelled orders cannot change fulfillment status.");
  }

  if (input.current.fulfillmentStatus === "delivered" && input.final.status === "cancelled") {
    throw AppError.conflict("Delivered orders cannot be cancelled.");
  }

  if (input.final.fulfillmentStatus === "delivered" && input.final.status === "cancelled") {
    throw AppError.conflict("Delivered orders cannot be cancelled.");
  }
}
