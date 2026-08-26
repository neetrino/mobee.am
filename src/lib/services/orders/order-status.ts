import { LEGACY_ORDER_STATUS_CONFIRMED } from "./order-fsm.constants";

export const ORDER_STATUSES = ["pending", "processing", "completed", "cancelled"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

const ORDER_STATUS_SET: ReadonlySet<string> = new Set(ORDER_STATUSES);

const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["processing", "cancelled"],
  processing: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

const TERMINAL: ReadonlySet<OrderStatus> = new Set(["completed", "cancelled"]);

export function isOrderStatus(value: string): value is OrderStatus {
  return ORDER_STATUS_SET.has(value);
}

export function isLegacyConfirmedOrderStatus(value: string): boolean {
  return value === LEGACY_ORDER_STATUS_CONFIRMED;
}

/**
 * Maps stored order status to the canonical FSM value.
 * Legacy payment-callback `confirmed` is an alias of `processing`.
 */
export function canonicalizeOrderStatus(value: string): OrderStatus | null {
  if (isLegacyConfirmedOrderStatus(value)) {
    return "processing";
  }
  if (isOrderStatus(value)) {
    return value;
  }
  return null;
}

export function isTerminalOrderStatus(status: OrderStatus): boolean {
  return TERMINAL.has(status);
}

export function getEligibleOrderStatuses(from: OrderStatus): OrderStatus[] {
  return [...TRANSITIONS[from]];
}

export function canTransitionOrderStatus(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function orderStatusListDetail(): string {
  return ORDER_STATUSES.join(", ");
}
