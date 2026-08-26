import { apiClient } from "@/lib/api-client";

export const CHECKOUT_IDEMPOTENCY_HEADER = "Idempotency-Key";

export type CheckoutOrderResponse = {
  order: {
    id: string;
    number: string;
    status: string;
    paymentStatus: string;
    total: number;
    currency: string;
  };
  payment: {
    provider: string;
    paymentUrl: string | null;
    expiresAt: string | null;
  };
  nextAction: string;
};

export async function postCheckoutOrder<TBody extends Record<string, unknown>>(
  body: TBody,
  idempotencyKey: string,
): Promise<CheckoutOrderResponse> {
  return apiClient.post<CheckoutOrderResponse>("/api/v1/orders/checkout", body, {
    headers: {
      [CHECKOUT_IDEMPOTENCY_HEADER]: idempotencyKey,
    },
  });
}
