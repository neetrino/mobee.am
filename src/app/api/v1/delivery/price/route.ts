import { NextRequest, NextResponse } from "next/server";
import { resolveCheckoutShippingAmount } from "@/lib/services/orders/checkout-shipping";
import { runApiRoute } from "@/lib/errors/run-api-route";
import { logger } from "@/lib/utils/logger";

/**
 * GET /api/v1/delivery/price
 * Quote delivery for checkout (city, cart subtotal after discount, speed).
 */
export async function GET(req: NextRequest) {
  return runApiRoute(req, async () => {
    const searchParams = req.nextUrl.searchParams;
    const city = searchParams.get("city");
    const country = searchParams.get("country") || "Armenia";
    const subtotalRaw = searchParams.get("subtotalAfterDiscountAmd");
    const speedRaw = searchParams.get("deliverySpeed");

    if (!city) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/validation-error",
          title: "Validation Error",
          status: 400,
          detail: "City parameter is required",
          instance: req.url,
        },
        { status: 400 }
      );
    }

    const parsedSubtotal = subtotalRaw !== null && subtotalRaw !== "" ? Number(subtotalRaw) : 0;
    const subtotalAfterDiscountAmd =
      Number.isFinite(parsedSubtotal) && parsedSubtotal >= 0 ? parsedSubtotal : 0;
    const deliverySpeed = speedRaw === "express" ? "express" : "standard";

    logger.debug("Delivery price request", {
      city,
      country,
      subtotalAfterDiscountAmd,
      deliverySpeed,
    });

    const result = await resolveCheckoutShippingAmount({
      shippingMethod: "delivery",
      city,
      country,
      subtotalAfterDiscountAmd,
      deliverySpeed,
    });

    return NextResponse.json({
      price: result.requiresQuote ? null : result.amount,
      requiresQuote: result.requiresQuote,
    });
  });
}
