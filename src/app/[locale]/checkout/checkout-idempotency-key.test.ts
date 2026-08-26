import { describe, expect, it } from "vitest";
import {
  getOrCreateCheckoutIdempotencyKey,
  resetCheckoutIdempotencyKey,
  type CheckoutIdempotencyKeyRef,
} from "./checkout-idempotency-key";

describe("checkout idempotency key ref", () => {
  it("reuses the same key until reset", () => {
    const ref: CheckoutIdempotencyKeyRef = { current: null };
    const first = getOrCreateCheckoutIdempotencyKey(ref);
    const second = getOrCreateCheckoutIdempotencyKey(ref);

    expect(first).toBe(second);
    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );

    resetCheckoutIdempotencyKey(ref);
    const third = getOrCreateCheckoutIdempotencyKey(ref);

    expect(third).not.toBe(first);
  });
});
