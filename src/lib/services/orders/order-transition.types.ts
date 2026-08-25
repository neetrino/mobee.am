import type { FulfillmentStatus } from "./fulfillment-status";
import type { RestockSkipReason } from "./order-fsm.constants";
import type { OrderStatus } from "./order-status";
import type { PaymentStatus } from "./payment-status";

export const COMMERCE_ACTOR_SOURCES = ["admin", "checkout", "payment_provider"] as const;

export type CommerceActorSource = (typeof COMMERCE_ACTOR_SOURCES)[number];

export interface CommerceRequestContext {
  requestId: string;
  actorUserId: string | null;
  source: CommerceActorSource;
  note?: string;
}

export type MachineChangeKind = "no_op" | "apply" | "normalize";

export interface MachineChange<TStatus extends string> {
  kind: MachineChangeKind;
  fromStored: string;
  fromCanonical: TStatus;
  to: TStatus;
}

export interface PlannedOrderTransitions {
  kind: "no_op" | "apply";
  order: MachineChange<OrderStatus>;
  payment: MachineChange<PaymentStatus>;
  fulfillment: MachineChange<FulfillmentStatus>;
  final: {
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    fulfillmentStatus: FulfillmentStatus;
  };
  isCancelRestock: boolean;
}

export interface LockedOrderRow {
  id: string;
  number: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  paidAt: Date | null;
  fulfilledAt: Date | null;
  cancelledAt: Date | null;
}

export interface RestockSkip {
  variantId: string | null;
  skuSnapshot: string | null;
  quantity: number;
  reason: RestockSkipReason;
}
