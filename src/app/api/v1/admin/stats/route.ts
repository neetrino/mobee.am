import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/middleware/admin-api-auth";
import { adminService } from "@/lib/services/admin.service";
import { withAdminPerfLog } from "@/lib/admin/admin-perf-log";
import { runApiRoute } from "@/lib/errors/run-api-route";

/**
 * Force dynamic rendering for this route
 * Prevents Next.js from statically generating this route
 */
export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/stats
 * Get admin statistics (users count, etc.)
 */
export async function GET(req: NextRequest) {
  return runApiRoute(req, async () => {
    return withAdminPerfLog("/api/v1/admin/stats", async (markAuthComplete) => {
      const authResult = await requireAdminApiContext(req);
      if (authResult instanceof NextResponse) {
        return authResult;
      }
      markAuthComplete(authResult.source);

      const result = await adminService.getStats();
      return NextResponse.json(result);
    });
  });
}
