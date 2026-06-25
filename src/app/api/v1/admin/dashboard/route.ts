import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/middleware/admin-api-auth";
import { adminService } from "@/lib/services/admin.service";
import { withAdminPerfLog } from "@/lib/admin/admin-perf-log";

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
  return withAdminPerfLog("/api/v1/admin/dashboard", async (markAuthComplete) => {
    try {
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
    } catch (error: unknown) {
      const err = error as {
        type?: string;
        title?: string;
        status?: number;
        detail?: string;
        message?: string;
      };
      console.error("[ADMIN DASHBOARD] Error:", err.message ?? err.detail);
      return NextResponse.json(
        {
          type: err.type || "https://api.shop.am/problems/internal-error",
          title: err.title || "Internal Server Error",
          status: err.status || 500,
          detail: err.detail || err.message || "An error occurred",
          instance: req.url,
        },
        { status: err.status || 500 },
      );
    }
  });
}
