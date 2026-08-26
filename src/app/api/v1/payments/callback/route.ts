import { NextRequest, NextResponse } from "next/server";
import { AppError } from "@/lib/errors/app-error";
import { runApiRoute } from "@/lib/errors/run-api-route";
import { getPaymentCallbackSecret } from "@/lib/security/payment-callback-secret";
import {
  isFreshCallbackTimestamp,
  verifyPaymentCallbackSignature,
} from "@/lib/services/orders/checkout-payment";
import { applyPaymentCallback } from "@/lib/services/orders/apply-payment-callback";
import { logger } from "@/lib/utils/logger";
import {
  ORDER_PLACED_QUERY_PARAM,
  ORDER_PLACED_QUERY_VALUE,
} from "@/app/[locale]/orders/order-placed.constants";
import type { PaymentStatus } from "@/lib/services/orders/payment-status";

const ALLOWED_PROVIDERS = new Set(["idram", "arca"]);
const ALLOWED_STATUSES = new Set<Extract<PaymentStatus, "paid" | "failed">>(["paid", "failed"]);

function toOrderRedirect(req: NextRequest, orderNumber: string, showPlacedConfirmation = false): URL {
  const url = new URL(`/orders/${orderNumber}`, req.nextUrl.origin);
  if (showPlacedConfirmation) {
    url.searchParams.set(ORDER_PLACED_QUERY_PARAM, ORDER_PLACED_QUERY_VALUE);
  }
  return url;
}

export async function GET(req: NextRequest) {
  return runApiRoute(req, async (ctx) => {
    if (!getPaymentCallbackSecret()) {
      throw AppError.serviceUnavailable();
    }

    const paymentId = req.nextUrl.searchParams.get("paymentId");
    const orderNumber = req.nextUrl.searchParams.get("orderNumber");
    const provider = req.nextUrl.searchParams.get("provider");
    const status = req.nextUrl.searchParams.get("status");
    const ts = req.nextUrl.searchParams.get("ts");
    const sig = req.nextUrl.searchParams.get("sig");

    if (!paymentId || !orderNumber || !provider || !status || !ts || !sig) {
      throw AppError.badRequest("Missing payment callback parameters");
    }

    if (!ALLOWED_PROVIDERS.has(provider) || !ALLOWED_STATUSES.has(status as "paid" | "failed")) {
      throw AppError.badRequest("Invalid provider or status");
    }

    const timestamp = Number(ts);
    if (!Number.isFinite(timestamp) || !isFreshCallbackTimestamp(timestamp)) {
      throw AppError.unauthorized("Expired callback signature");
    }

    const callbackStatus = status as "paid" | "failed";
    const validSignature = verifyPaymentCallbackSignature(
      {
        paymentId,
        orderNumber,
        provider: provider as "idram" | "arca",
        status: callbackStatus,
        timestamp,
      },
      sig,
    );

    if (!validSignature) {
      throw AppError.unauthorized("Invalid callback signature");
    }

    await applyPaymentCallback(
      {
        paymentId,
        orderNumber,
        status: callbackStatus,
        provider,
      },
      ctx.commerce({ source: "payment_provider" }),
    );

    logger.info("Payment callback processed", {
      requestId: ctx.requestId,
      paymentId,
      orderNumber,
      provider,
      status: callbackStatus,
    });

    return NextResponse.redirect(toOrderRedirect(req, orderNumber, callbackStatus === "paid"));
  });
}
