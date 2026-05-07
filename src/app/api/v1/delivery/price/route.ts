import { NextRequest, NextResponse } from "next/server";
import { resolveCheckoutShippingAmount } from "@/lib/services/orders/checkout-shipping";
import { logger } from "@/lib/utils/logger";

/**
 * GET /api/v1/delivery/price
 * Quote delivery for checkout (city, cart subtotal after discount, speed).
 */
export async function GET(req: NextRequest) {
  try {
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
  } catch (error: unknown) {
    const err = error as {
      message?: string;
      stack?: string;
      code?: string;
      type?: string;
      title?: string;
      status?: number;
      detail?: string;
    };
    logger.error("Delivery price error", {
      message: err?.message,
      code: err?.code,
      type: err?.type,
      status: err?.status,
    });
    return NextResponse.json(
      {
        type: err?.type ?? "https://api.shop.am/problems/internal-error",
        title: err?.title ?? "Internal Server Error",
        status: err?.status ?? 500,
        detail: err?.detail ?? err?.message ?? "An error occurred",
        instance: req.url,
      },
      { status: err?.status ?? 500 }
    );
  }
}
