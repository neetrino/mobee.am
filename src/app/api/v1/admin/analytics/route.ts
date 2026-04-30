import { NextRequest, NextResponse } from "next/server";
import { authenticateToken, requireAdmin } from "@/lib/middleware/auth";
import { adminService } from "@/lib/services/admin.service";
import {
  ADMIN_ANALYTICS_PERIODS,
  type AdminAnalyticsPeriod,
} from "@/lib/contracts/admin-analytics";

/**
 * Force dynamic rendering for this route
 * Prevents Next.js from statically generating this route
 */
export const dynamic = "force-dynamic";

function parsePeriod(value: string | null): AdminAnalyticsPeriod {
  if (value && ADMIN_ANALYTICS_PERIODS.includes(value as AdminAnalyticsPeriod)) {
    return value as AdminAnalyticsPeriod;
  }
  return "week";
}

/**
 * GET /api/v1/admin/analytics
 * Get analytics data for admin dashboard
 */
export async function GET(req: NextRequest) {
  try {
    console.log("📊 [ANALYTICS] Request received");
    const user = await authenticateToken(req);
    
    if (!user || !requireAdmin(user)) {
      console.log("❌ [ANALYTICS] Unauthorized or not admin");
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/forbidden",
          title: "Forbidden",
          status: 403,
          detail: "Admin access required",
          instance: req.url,
        },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const period = parsePeriod(searchParams.get("period"));
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    console.log(`✅ [ANALYTICS] User authenticated: ${user.id}, period: ${period}`);
    const result = await adminService.getAnalytics(period, startDate, endDate);
    console.log("✅ [ANALYTICS] Analytics data retrieved successfully");
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("❌ [ANALYTICS] Error:", {
      message: error.message,
      stack: error.stack,
      type: error.type,
      status: error.status,
      detail: error.detail,
      url: req.url,
    });
    return NextResponse.json(
      {
        type: error.type || "https://api.shop.am/problems/internal-error",
        title: error.title || "Internal Server Error",
        status: error.status || 500,
        detail: error.detail || error.message || "An error occurred",
        instance: req.url,
      },
      { status: error.status || 500 }
    );
  }
}

