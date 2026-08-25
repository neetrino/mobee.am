import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { authenticateToken } from "@/lib/middleware/auth";
import { ordersService } from "@/lib/services/orders.service";
import { PROBLEM_JSON } from "@/lib/errors/problem-response";
import { REQUEST_ID_HEADER } from "@/lib/errors/request-id";

vi.mock("@/lib/middleware/auth", () => ({
  authenticateToken: vi.fn(),
}));

vi.mock("@/lib/services/orders.service", () => ({
  ordersService: {
    checkout: vi.fn(),
  },
}));

const checkoutBody = {
  email: "guest@example.com",
  phone: "+37411111111",
  shippingMethod: "pickup",
  paymentMethod: "cash_on_delivery",
  items: [{ productId: "prod-1", variantId: "var-1", quantity: 1 }],
};

describe("POST /api/v1/orders/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authenticateToken).mockResolvedValue(null);
  });

  it("returns 201 with order, payment, and nextAction", async () => {
    vi.mocked(ordersService.checkout).mockResolvedValue({
      order: {
        id: "order-1",
        number: "1001",
        status: "pending",
        paymentStatus: "pending",
        total: 1000,
        currency: "AMD",
      },
      payment: {
        provider: "cash_on_delivery",
        paymentUrl: null,
        expiresAt: null,
      },
      nextAction: "view_order",
    });

    const req = new NextRequest("http://localhost:3000/api/v1/orders/checkout", {
      method: "POST",
      body: JSON.stringify(checkoutBody),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body).toEqual({
      order: expect.objectContaining({
        id: "order-1",
        number: "1001",
        status: "pending",
        paymentStatus: "pending",
      }),
      payment: expect.objectContaining({
        provider: "cash_on_delivery",
        paymentUrl: null,
      }),
      nextAction: "view_order",
    });
  });

  it("returns 422 problem+json for insufficient stock and echoes the request id", async () => {
    vi.mocked(ordersService.checkout).mockRejectedValue({
      status: 422,
      type: "https://api.shop.am/problems/validation-error",
      title: "Insufficient stock",
      detail: "Insufficient stock for SKU SKU-1. Available: 0, requested: 1",
    });

    const req = new NextRequest("http://localhost:3000/api/v1/orders/checkout", {
      method: "POST",
      body: JSON.stringify(checkoutBody),
      headers: {
        "content-type": "application/json",
        [REQUEST_ID_HEADER]: "checkout-req-1",
      },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(res.headers.get("content-type")).toContain(PROBLEM_JSON);
    expect(res.headers.get(REQUEST_ID_HEADER)).toBe("checkout-req-1");
    expect(body.title).toBe("Insufficient stock");
    expect(body.requestId).toBe("checkout-req-1");
  });
});
