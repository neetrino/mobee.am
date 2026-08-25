export const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

const PAYMENT_STATUS_SET: ReadonlySet<string> = new Set(PAYMENT_STATUSES);

const TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  pending: ["paid", "failed"],
  paid: ["refunded"],
  failed: ["pending"],
  refunded: [],
};

const TERMINAL: ReadonlySet<PaymentStatus> = new Set(["refunded"]);

export function isPaymentStatus(value: string): value is PaymentStatus {
  return PAYMENT_STATUS_SET.has(value);
}

export function isTerminalPaymentStatus(status: PaymentStatus): boolean {
  return TERMINAL.has(status);
}

export function getEligiblePaymentStatuses(from: PaymentStatus): PaymentStatus[] {
  return [...TRANSITIONS[from]];
}

export function canTransitionPaymentStatus(from: PaymentStatus, to: PaymentStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function paymentStatusListDetail(): string {
  return PAYMENT_STATUSES.join(", ");
}
