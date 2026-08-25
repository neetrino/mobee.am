import { NextRequest, NextResponse } from "next/server";
import { adminService } from "@/lib/services/admin.service";
import { runApiRoute } from "@/lib/errors/run-api-route";

const DEFAULT_CURRENCY_RATES = {
  USD: 1,
  AMD: 400,
  EUR: 0.92,
  RUB: 90,
  GEL: 2.7,
};

/**
 * Get currency exchange rates (public endpoint)
 */
export async function GET(req: NextRequest) {
  return runApiRoute(req, async () => {
    try {
      const settings = await adminService.getSettings();
      const rates = settings.currencyRates || DEFAULT_CURRENCY_RATES;

      return NextResponse.json(rates, {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      });
    } catch {
      return NextResponse.json(DEFAULT_CURRENCY_RATES, {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      });
    }
  });
}
