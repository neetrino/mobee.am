import type { Prisma } from "@white-shop/db";
import { createPaymentUrl } from "./checkout-payment";

type CheckoutOrderRow = {
  id: string;
  number: string;
  status: string;
  paymentStatus: string;
  total: Prisma.Decimal | number;
  currency: string;
};

type CheckoutPaymentRow = {
  id: string;
  provider: string;
};

export function buildCheckoutSuccessResponse(input: {
  order: CheckoutOrderRow;
  payment: CheckoutPaymentRow;
  baseUrl: string;
}) {
  const paymentUrl = createPaymentUrl({
    paymentId: input.payment.id,
    orderNumber: input.order.number,
    amount: Number(input.order.total),
    provider: input.payment.provider as "idram" | "arca" | "cash_on_delivery" | "aparik",
    baseUrl: input.baseUrl,
  });

  return {
    order: {
      id: input.order.id,
      number: input.order.number,
      status: input.order.status,
      paymentStatus: input.order.paymentStatus,
      total: input.order.total,
      currency: input.order.currency,
    },
    payment: {
      provider: input.payment.provider,
      paymentUrl,
      expiresAt: null,
    },
    nextAction:
      (input.payment.provider === "idram" || input.payment.provider === "arca") &&
      Boolean(paymentUrl)
        ? ("redirect_to_payment" as const)
        : ("view_order" as const),
  };
}
