import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/middleware/admin-api-auth";
import { adminService } from "@/lib/services/admin.service";
import { withAdminPerfLog } from "@/lib/admin/admin-perf-log";
import { runApiRoute } from "@/lib/errors/run-api-route";

export const dynamic = "force-dynamic";

function parseLimitParam(value: string | null, fallback: number): number {
  const parsed = parseInt(value ?? String(fallback), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return Math.min(parsed, 50);
}

/**
 * GET /api/v1/admin/dashboard
 * BFF batch endpoint for admin dashboard cards.
 */
export async function GET(req: NextRequest) {
  return runApiRoute(req, async () => {
    return withAdminPerfLog("/api/v1/admin/dashboard", async (markAuthComplete) => {
      const authResult = await requireAdminApiContext(req);
      if (authResult instanceof NextResponse) {
        return authResult;
      }
      markAuthComplete(authResult.source);

      const { searchParams } = new URL(req.url);
      const bundle = await adminService.getDashboardBundle({
        recentOrdersLimit: parseLimitParam(searchParams.get("recentOrdersLimit"), 5),
        topProductsLimit: parseLimitParam(searchParams.get("topProductsLimit"), 5),
        userActivityLimit: parseLimitParam(searchParams.get("userActivityLimit"), 10),
      });

      return NextResponse.json(bundle);
    });
  });
}
