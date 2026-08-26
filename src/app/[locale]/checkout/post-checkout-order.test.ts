import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/lib/api-client";
import {
  CHECKOUT_IDEMPOTENCY_HEADER,
  postCheckoutOrder,
} from "./post-checkout-order";

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

describe("postCheckoutOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends the same Idempotency-Key header on repeated calls", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
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

    const body = {
      cartId: "guest-cart",
      email: "guest@example.com",
      phone: "+37411111111",
      shippingMethod: "pickup",
      paymentMethod: "cash_on_delivery",
    };
    const idempotencyKey = "11111111-2222-4333-8444-555555555555";

    await postCheckoutOrder(body, idempotencyKey);
    await postCheckoutOrder(body, idempotencyKey);

    expect(apiClient.post).toHaveBeenCalledTimes(2);
    expect(apiClient.post).toHaveBeenNthCalledWith(
      1,
      "/api/v1/orders/checkout",
      body,
      { headers: { [CHECKOUT_IDEMPOTENCY_HEADER]: idempotencyKey } },
    );
    expect(apiClient.post).toHaveBeenNthCalledWith(
      2,
      "/api/v1/orders/checkout",
      body,
      { headers: { [CHECKOUT_IDEMPOTENCY_HEADER]: idempotencyKey } },
    );
  });
});
