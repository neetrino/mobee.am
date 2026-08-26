export const FULFILLMENT_STATUSES = [
  "unfulfilled",
  "fulfilled",
  "shipped",
  "delivered",
] as const;

export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number];

const FULFILLMENT_STATUS_SET: ReadonlySet<string> = new Set(FULFILLMENT_STATUSES);

const TRANSITIONS: Record<FulfillmentStatus, readonly FulfillmentStatus[]> = {
  unfulfilled: ["fulfilled", "shipped"],
  fulfilled: ["shipped"],
  shipped: ["delivered"],
  delivered: [],
};

const TERMINAL: ReadonlySet<FulfillmentStatus> = new Set(["delivered"]);

export function isFulfillmentStatus(value: string): value is FulfillmentStatus {
  return FULFILLMENT_STATUS_SET.has(value);
}

export function isTerminalFulfillmentStatus(status: FulfillmentStatus): boolean {
  return TERMINAL.has(status);
}

export function getEligibleFulfillmentStatuses(from: FulfillmentStatus): FulfillmentStatus[] {
  return [...TRANSITIONS[from]];
}

export function canTransitionFulfillmentStatus(
  from: FulfillmentStatus,
  to: FulfillmentStatus,
): boolean {
  return TRANSITIONS[from].includes(to);
}

export function fulfillmentStatusListDetail(): string {
  return FULFILLMENT_STATUSES.join(", ");
}
