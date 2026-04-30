import { NextResponse } from "next/server";
import { adminService } from "@/lib/services/admin.service";

/**
 * Get currency exchange rates (public endpoint)
 */
export async function GET() {
  try {
    const settings = await adminService.getSettings();
    const rates = settings.currencyRates || {
      USD: 1,
      AMD: 400,
      EUR: 0.92,
      RUB: 90,
      GEL: 2.7,
    };
    
    return NextResponse.json(rates, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error: any) {
    console.error("❌ [CURRENCY RATES] Error:", error);
    // Return default rates on error
    return NextResponse.json(
      {
        USD: 1,
        AMD: 400,
        EUR: 0.92,
        RUB: 90,
        GEL: 2.7,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      },
    );
  }
}

