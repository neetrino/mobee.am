import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/middleware/admin-api-auth";
import { adminService } from "@/lib/services/admin.service";
import { withAdminPerfLog } from "@/lib/admin/admin-perf-log";
import { runApiRoute } from "@/lib/errors/run-api-route";

/**
 * GET /api/v1/admin/dashboard/top-products
 * Get top products for admin dashboard
 */
export async function GET(req: NextRequest) {
  return runApiRoute(req, async () => {
    return withAdminPerfLog("/api/v1/admin/dashboard/top-products", async (markAuthComplete) => {
      const authResult = await requireAdminApiContext(req);
      if (authResult instanceof NextResponse) {
        return authResult;
      }
      markAuthComplete(authResult.source);

      const { searchParams } = new URL(req.url);
      const limit = parseInt(searchParams.get("limit") || "5", 10);
      const result = await adminService.getTopProducts(limit);

      return NextResponse.json({ data: result });
    });
  });
}
