export type CheckoutIdempotencyKeyRef = {
  current: string | null;
};

export function getOrCreateCheckoutIdempotencyKey(ref: CheckoutIdempotencyKeyRef): string {
  if (!ref.current) {
    ref.current = crypto.randomUUID();
  }
  return ref.current;
}

export function resetCheckoutIdempotencyKey(ref: CheckoutIdempotencyKeyRef): void {
  ref.current = null;
}
