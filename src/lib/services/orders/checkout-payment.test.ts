import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createPaymentUrl,
  createSignedCallbackUrl,
  isFreshCallbackTimestamp,
  verifyPaymentCallbackSignature,
} from "./checkout-payment";

describe("checkout-payment", () => {
  afterEach(() => {
    delete process.env.PAYMENT_CALLBACK_SECRET;
    delete process.env.IDRAM_PAYMENT_URL;
    delete process.env.ARCA_PAYMENT_URL;
    vi.useRealTimers();
  });

  it("creates and verifies signed callback URL", () => {
    process.env.PAYMENT_CALLBACK_SECRET = "test-secret";
    const callbackUrl = createSignedCallbackUrl(
      {
        paymentId: "pay_1",
        orderNumber: "250423-ABC1234567",
        provider: "idram",
        status: "paid",
        timestamp: 1_700_000_000_000,
      },
      "https://shop.example"
    );
    const parsed = new URL(callbackUrl);
    const sig = parsed.searchParams.get("sig");

    expect(sig).toBeTruthy();
    expect(
      verifyPaymentCallbackSignature(
        {
          paymentId: "pay_1",
          orderNumber: "250423-ABC1234567",
          provider: "idram",
          status: "paid",
          timestamp: 1_700_000_000_000,
        },
        sig ?? ""
      )
    ).toBe(true);
  });

  it("creates payment url for online provider", () => {
    process.env.PAYMENT_CALLBACK_SECRET = "test-secret";
    process.env.IDRAM_PAYMENT_URL = "https://pay.idram.example/session";
    const paymentUrl = createPaymentUrl({
      paymentId: "pay_2",
      orderNumber: "250423-XYZ1234567",
      amount: 19999.5,
      provider: "idram",
      baseUrl: "https://shop.example",
    });

    expect(paymentUrl).toContain("pay.idram.example/session");
    expect(paymentUrl).toContain("orderNumber=250423-XYZ1234567");
    expect(paymentUrl).toContain("successUrl=");
  });

  it("returns null payment URL when provider is not configured", () => {
    process.env.PAYMENT_CALLBACK_SECRET = "test-secret";
    const paymentUrl = createPaymentUrl({
      paymentId: "pay_3",
      orderNumber: "250423-XYZ0000000",
      amount: 5000,
      provider: "arca",
      baseUrl: "https://shop.example",
    });

    expect(paymentUrl).toBeNull();
  });

  it("validates callback timestamp freshness", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-23T12:00:00.000Z"));
    const now = Date.now();

    expect(isFreshCallbackTimestamp(now - 5 * 60 * 1000, now)).toBe(true);
    expect(isFreshCallbackTimestamp(now - 11 * 60 * 1000, now)).toBe(false);
  });
});
