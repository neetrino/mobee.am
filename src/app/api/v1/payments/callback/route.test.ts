import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/security/payment-callback-secret", () => ({
  getPaymentCallbackSecret: vi.fn(),
}));

vi.mock("@/lib/services/orders/checkout-payment", () => ({
  isFreshCallbackTimestamp: vi.fn(() => true),
  verifyPaymentCallbackSignature: vi.fn(() => false),
}));

vi.mock("@/lib/services/orders/apply-payment-callback", () => ({
  applyPaymentCallback: vi.fn(),
}));

import { GET } from "./route";
import { getPaymentCallbackSecret } from "@/lib/security/payment-callback-secret";
import { applyPaymentCallback } from "@/lib/services/orders/apply-payment-callback";
import { verifyPaymentCallbackSignature } from "@/lib/services/orders/checkout-payment";
import { AppError } from "@/lib/errors/app-error";

describe("GET /api/v1/payments/callback", () => {
  beforeEach(() => {
    vi.mocked(getPaymentCallbackSecret).mockReset();
    vi.mocked(applyPaymentCallback).mockReset();
    vi.mocked(verifyPaymentCallbackSignature).mockReset();
    vi.mocked(verifyPaymentCallbackSignature).mockReturnValue(false);
  });

  it("rejects a missing secret without leaking configuration", async () => {
    vi.mocked(getPaymentCallbackSecret).mockReturnValue("");
    const res = await GET(
      new NextRequest(
        "http://localhost:3000/api/v1/payments/callback?paymentId=p1&orderNumber=o1&provider=idram&status=paid&ts=1&sig=abc",
      ),
    );
    const body = await res.json();
    expect(res.status).toBe(503);
    expect(JSON.stringify(body)).not.toContain("PAYMENT_CALLBACK_SECRET");
    expect(JSON.stringify(body)).not.toContain("JWT_SECRET");
  });

  it("rejects an invalid signature without leaking provider bodies", async () => {
    vi.mocked(getPaymentCallbackSecret).mockReturnValue("callback-secret-value");
    const res = await GET(
      new NextRequest(
        "http://localhost:3000/api/v1/payments/callback?paymentId=p1&orderNumber=o1&provider=idram&status=paid&ts=1&sig=bad",
      ),
    );
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(JSON.stringify(body)).not.toContain("callback-secret-value");
  });

  it("redirects after a successful paid callback without an Order.status field", async () => {
    vi.mocked(getPaymentCallbackSecret).mockReturnValue("callback-secret-value");
    vi.mocked(verifyPaymentCallbackSignature).mockReturnValue(true);
    vi.mocked(applyPaymentCallback).mockResolvedValue("applied");

    const res = await GET(
      new NextRequest(
        "http://localhost:3000/api/v1/payments/callback?paymentId=p1&orderNumber=o1&provider=idram&status=paid&ts=1&sig=ok",
      ),
    );

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/orders/o1");
    expect(applyPaymentCallback).toHaveBeenCalledWith(
      {
        paymentId: "p1",
        orderNumber: "o1",
        status: "paid",
        provider: "idram",
      },
      expect.objectContaining({ source: "payment_provider" }),
    );
    expect(vi.mocked(applyPaymentCallback).mock.calls[0]?.[0]).not.toHaveProperty("orderStatus");
  });

  it("returns 409 for a stale payment attempt", async () => {
    vi.mocked(getPaymentCallbackSecret).mockReturnValue("callback-secret-value");
    vi.mocked(verifyPaymentCallbackSignature).mockReturnValue(true);
    vi.mocked(applyPaymentCallback).mockRejectedValue(
      AppError.conflict("Payment callback does not match the current payment attempt."),
    );

    const res = await GET(
      new NextRequest(
        "http://localhost:3000/api/v1/payments/callback?paymentId=p-old&orderNumber=o1&provider=idram&status=paid&ts=1&sig=ok",
      ),
    );
    const body = await res.json();
    expect(res.status).toBe(409);
    expect(body.status).toBe(409);
  });

  it("returns 503 without leakage when the database is down", async () => {
    vi.mocked(getPaymentCallbackSecret).mockReturnValue("callback-secret-value");
    const { verifyPaymentCallbackSignature } = await import("@/lib/services/orders/checkout-payment");
    vi.mocked(verifyPaymentCallbackSignature).mockReturnValue(true);
    vi.mocked(applyPaymentCallback).mockRejectedValue(
      Object.assign(new Error("Can't reach database server at postgres://secret"), {
        name: "PrismaClientInitializationError",
      }),
    );
    const res = await GET(
      new NextRequest(
        "http://localhost:3000/api/v1/payments/callback?paymentId=p1&orderNumber=o1&provider=idram&status=paid&ts=1&sig=ok",
      ),
    );
    const body = await res.json();
    expect(res.status).toBe(503);
    expect(JSON.stringify(body)).not.toContain("postgres://");
  });
});
