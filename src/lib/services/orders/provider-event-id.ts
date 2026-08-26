import { hashCheckoutValue } from "./checkout-idempotency";

/**
 * Stable provider callback event id for replay deduplication.
 * Same paymentId+status+orderNumber replays must not create a second write.
 */
export function buildProviderEventId(input: {
  provider: string;
  paymentId: string;
  status: string;
  orderNumber: string;
}): string {
  return hashCheckoutValue(
    `${input.provider}|${input.paymentId}|${input.status}|${input.orderNumber}`,
  );
}
