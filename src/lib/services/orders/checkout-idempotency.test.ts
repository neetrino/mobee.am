import { describe, expect, it } from "vitest";
import {
  buildCheckoutRequestFingerprint,
  buildIdempotencyKeyHash,
  buildIdempotencyScopeHash,
  hashCheckoutValue,
  IDEMPOTENCY_KEY_PATTERN,
  normalizeCheckoutEmail,
  normalizeCheckoutPhone,
  parseIdempotencyKeyHeader,
} from "./checkout-idempotency";

describe("checkout idempotency helpers", () => {
  it("validates idempotency key format", () => {
    expect(IDEMPOTENCY_KEY_PATTERN.test("abc12345")).toBe(true);
    expect(IDEMPOTENCY_KEY_PATTERN.test("key.with-dash_1")).toBe(true);
    expect(IDEMPOTENCY_KEY_PATTERN.test("short")).toBe(false);
    expect(IDEMPOTENCY_KEY_PATTERN.test("has space key")).toBe(false);
  });

  it("parses header and alias without exposing invalid keys", () => {
    expect(parseIdempotencyKeyHeader(null, null)).toEqual({ key: null, invalid: false });
    expect(parseIdempotencyKeyHeader(" checkout-key-12345678 ", null)).toEqual({
      key: "checkout-key-12345678",
      invalid: false,
    });
    expect(parseIdempotencyKeyHeader(null, "alias-key-123456789")).toEqual({
      key: "alias-key-123456789",
      invalid: false,
    });
    expect(parseIdempotencyKeyHeader("bad key!", null)).toEqual({ key: null, invalid: true });
  });

  it("hashes scope for user and guest identities", () => {
    const userScope = buildIdempotencyScopeHash({
      userId: "user-1",
      email: "a@example.com",
      phone: "+37411111111",
    });
    const guestScope = buildIdempotencyScopeHash({
      email: "Guest@Example.com",
      phone: "374 11 111 111",
    });
    expect(userScope).toBe(hashCheckoutValue("user:user-1"));
    expect(guestScope).toBe(
      hashCheckoutValue(`guest:${normalizeCheckoutEmail("Guest@Example.com")}|${normalizeCheckoutPhone("374 11 111 111")}`),
    );
    expect(userScope).not.toBe(guestScope);
  });

  it("builds stable canonical fingerprints regardless of item order", () => {
    const left = buildCheckoutRequestFingerprint({
      items: [
        { variantId: "var-b", quantity: 2 },
        { variantId: "var-a", quantity: 1 },
      ],
      email: "Guest@Test.com",
      phone: "+37455000000",
      shippingMethod: "pickup",
      paymentMethod: "cash_on_delivery",
      promoCode: " save10 ",
    });
    const right = buildCheckoutRequestFingerprint({
      items: [
        { variantId: "var-a", quantity: 1 },
        { variantId: "var-b", quantity: 2 },
      ],
      email: "guest@test.com",
      phone: "37455000000",
      shippingMethod: "pickup",
      paymentMethod: "cash_on_delivery",
      promoCode: "save10",
    });
    expect(left).toBe(right);
    expect(buildIdempotencyKeyHash("client-key-12345678")).toHaveLength(64);
  });
});
