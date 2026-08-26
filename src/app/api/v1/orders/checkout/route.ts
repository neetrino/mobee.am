import { NextRequest, NextResponse } from "next/server";
import { authenticateToken } from "@/lib/middleware/auth";
import { parseCheckoutBody } from "@/lib/schemas/checkout.schema";
import { ordersService } from "@/lib/services/orders.service";
import { normalizeCheckoutLocale } from "@/lib/services/orders/checkout-calculations";
import {
  CHECKOUT_IDEMPOTENCY_KEY_INVALID,
  parseIdempotencyKeyHeader,
} from "@/lib/services/orders/checkout-idempotency";
import { runApiRoute } from "@/lib/errors/run-api-route";
import { logger } from "@/lib/utils/logger";

export async function POST(req: NextRequest) {
  return runApiRoute(req, async (ctx) => {
    logger.info("Checkout request received", {
      requestId: ctx.requestId,
      hasIdempotencyKey: Boolean(
        parseIdempotencyKeyHeader(
          req.headers.get("Idempotency-Key"),
          req.headers.get("X-Idempotency-Key"),
        ).key,
      ),
    });
    const user = await authenticateToken(req);

    const parsedIdempotency = parseIdempotencyKeyHeader(
      req.headers.get("Idempotency-Key"),
      req.headers.get("X-Idempotency-Key"),
    );
    if (parsedIdempotency.invalid) {
      throw CHECKOUT_IDEMPOTENCY_KEY_INVALID;
    }

    const body = await req.json();
    const data = parseCheckoutBody(body);
    const acceptLanguage = req.headers.get("accept-language");
    const requestLocale = normalizeCheckoutLocale(data.locale || user?.locale || acceptLanguage);
    const checkoutData = { ...data, locale: requestLocale };

    logger.debug("Checkout data", {
      requestId: ctx.requestId,
      userId: user?.id ?? null,
      cartId: data.cartId,
      itemsCount: data.items?.length || 0,
      paymentMethod: data.paymentMethod,
      shippingMethod: data.shippingMethod,
      locale: requestLocale,
    });

    const result = await ordersService.checkout(
      checkoutData,
      user?.id,
      req.nextUrl.origin,
      ctx.commerce({ actorUserId: user?.id ?? null, source: "checkout" }),
      { idempotencyKey: parsedIdempotency.key },
    );

    logger.info("Checkout successful", {
      requestId: ctx.requestId,
      orderNumber: result.order?.number,
      orderId: result.order?.id,
    });

    return NextResponse.json(result, { status: 201 });
  });
}
