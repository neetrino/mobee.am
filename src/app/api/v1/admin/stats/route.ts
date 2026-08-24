import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/middleware/admin-api-auth";
import { adminService } from "@/lib/services/admin.service";
import { withAdminPerfLog } from "@/lib/admin/admin-perf-log";

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
  return withAdminPerfLog("/api/v1/admin/stats", async (markAuthComplete) => {
    try {
      const authResult = await requireAdminApiContext(req);
      if (authResult instanceof NextResponse) {
        return authResult;
      }
      markAuthComplete(authResult.source);

      const result = await adminService.getStats();
      return NextResponse.json(result);
    } catch (error: unknown) {
      const err = error as {
        type?: string;
        title?: string;
        status?: number;
        detail?: string;
        message?: string;
      };
      console.error("[ADMIN STATS] Error:", err.message ?? err.detail);
      return NextResponse.json(
        {
          type: err.type || "https://api.shop.am/problems/internal-error",
          title: err.title || "Internal Server Error",
          status: err.status || 500,
          detail: err.detail || err.message || "An error occurred",
          instance: req.url,
        },
        { status: err.status || 500 }
      );
    }
  });
}
