import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/middleware/admin-api-auth";
import { adminService } from "@/lib/services/admin.service";
import { withAdminPerfLog } from "@/lib/admin/admin-perf-log";
import {
  ADMIN_ANALYTICS_PERIODS,
  type AdminAnalyticsPeriod,
} from "@/lib/contracts/admin-analytics";
import { runApiRoute } from "@/lib/errors/run-api-route";

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
  return runApiRoute(req, async () => {
    return withAdminPerfLog("/api/v1/admin/analytics", async (markAuthComplete) => {
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
    });
  });
}
