import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/middleware/admin-api-auth";
import { adminService } from "@/lib/services/admin.service";
import { withAdminPerfLog } from "@/lib/admin/admin-perf-log";
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
  return withAdminPerfLog("/api/v1/admin/analytics", async (markAuthComplete) => {
    try {
      const authResult = await requireAdminApiContext(req);
      if (authResult instanceof NextResponse) {
        return authResult;
      }
      markAuthComplete(authResult.source);

      const { searchParams } = new URL(req.url);
      const period = parsePeriod(searchParams.get("period"));
      const startDate = searchParams.get("startDate") || undefined;
      const endDate = searchParams.get("endDate") || undefined;

      const result = await adminService.getAnalytics(period, startDate, endDate);

      return NextResponse.json(result);
    } catch (error: unknown) {
      const err = error as {
        message?: string;
        stack?: string;
        type?: string;
        status?: number;
        detail?: string;
      };
      console.error("[ANALYTICS] Error:", err.message ?? err.detail);
      return NextResponse.json(
        {
          type: err.type || "https://api.shop.am/problems/internal-error",
          title: "Internal Server Error",
          status: err.status || 500,
          detail: err.detail || err.message || "An error occurred",
          instance: req.url,
        },
        { status: err.status || 500 },
      );
    }
  });
}

