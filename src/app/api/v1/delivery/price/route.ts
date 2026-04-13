import { NextRequest, NextResponse } from "next/server";
import { adminService } from "@/lib/services/admin.service";
import { logger } from "@/lib/utils/logger";

/**
 * GET /api/v1/delivery/price
 * Get delivery price for a specific city
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const city = searchParams.get('city');
    const country = searchParams.get('country') || 'Armenia';

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

    logger.debug("Delivery price request", { city, country });
    const price = await adminService.getDeliveryPrice(city, country);

    return NextResponse.json({ price });
  } catch (error: unknown) {
    const err = error as { message?: string; stack?: string; code?: string; type?: string; title?: string; status?: number; detail?: string; meta?: unknown };
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

