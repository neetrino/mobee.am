import { NextRequest, NextResponse } from "next/server";
import { db } from "@white-shop/db";
import {
  isFreshCallbackTimestamp,
  verifyPaymentCallbackSignature,
} from "@/lib/services/orders/checkout-payment";
import { logger } from "@/lib/utils/logger";

const ALLOWED_PROVIDERS = new Set(["idram", "arca"]);
const ALLOWED_STATUSES = new Set(["paid", "failed"]);

function toOrderRedirect(req: NextRequest, orderNumber: string): URL {
  return new URL(`/orders/${orderNumber}`, req.nextUrl.origin);
}

export async function GET(req: NextRequest) {
  const paymentId = req.nextUrl.searchParams.get("paymentId");
  const orderNumber = req.nextUrl.searchParams.get("orderNumber");
  const provider = req.nextUrl.searchParams.get("provider");
  const status = req.nextUrl.searchParams.get("status");
  const ts = req.nextUrl.searchParams.get("ts");
  const sig = req.nextUrl.searchParams.get("sig");

  if (!paymentId || !orderNumber || !provider || !status || !ts || !sig) {
    return NextResponse.json(
      {
        status: 400,
        title: "Validation Error",
        detail: "Missing payment callback parameters",
      },
      { status: 400 }
    );
  }

  if (!ALLOWED_PROVIDERS.has(provider) || !ALLOWED_STATUSES.has(status)) {
    return NextResponse.json(
      {
        status: 400,
        title: "Validation Error",
        detail: "Invalid provider or status",
      },
      { status: 400 }
    );
  }

  const timestamp = Number(ts);
  if (!Number.isFinite(timestamp) || !isFreshCallbackTimestamp(timestamp)) {
    return NextResponse.json(
      {
        status: 401,
        title: "Unauthorized",
        detail: "Expired callback signature",
      },
      { status: 401 }
    );
  }

  const validSignature = verifyPaymentCallbackSignature(
    {
      paymentId,
      orderNumber,
      provider: provider as "idram" | "arca",
      status: status as "paid" | "failed",
      timestamp,
    },
    sig
  );

  if (!validSignature) {
    return NextResponse.json(
      {
        status: 401,
        title: "Unauthorized",
        detail: "Invalid callback signature",
      },
      { status: 401 }
    );
  }

  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: { order: true },
  });

  if (!payment || payment.order.number !== orderNumber) {
    return NextResponse.json(
      {
        status: 404,
        title: "Not Found",
        detail: "Payment not found",
      },
      { status: 404 }
    );
  }

  const paid = status === "paid";
  await db.$transaction([
    db.payment.update({
      where: { id: payment.id },
      data: {
        status: paid ? "paid" : "failed",
        providerResponse: {
          callbackStatus: status,
          provider,
          receivedAt: new Date().toISOString(),
        },
        completedAt: paid ? new Date() : null,
        failedAt: paid ? null : new Date(),
      },
    }),
    db.order.update({
      where: { id: payment.orderId },
      data: {
        paymentStatus: paid ? "paid" : "failed",
        status: paid ? "confirmed" : "pending",
      },
    }),
  ]);

  logger.info("Payment callback processed", {
    paymentId,
    orderNumber,
    provider,
    status,
  });

  return NextResponse.redirect(toOrderRedirect(req, orderNumber));
}
