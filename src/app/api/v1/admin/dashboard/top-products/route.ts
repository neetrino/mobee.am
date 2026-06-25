import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/middleware/admin-api-auth";
import { adminService } from "@/lib/services/admin.service";
import { withAdminPerfLog } from "@/lib/admin/admin-perf-log";

/**
 * GET /api/v1/admin/dashboard/top-products
 * Get top products for admin dashboard
 */
export async function GET(req: NextRequest) {
  return withAdminPerfLog("/api/v1/admin/dashboard/top-products", async (markAuthComplete) => {
    try {
      const authResult = await requireAdminApiContext(req);
      if (authResult instanceof NextResponse) {
        return authResult;
      }
      markAuthComplete(authResult.source);

      const { searchParams } = new URL(req.url);
      const limit = parseInt(searchParams.get("limit") || "5", 10);
      const result = await adminService.getTopProducts(limit);

      return NextResponse.json({ data: result });
    } catch (error: unknown) {
      const err = error as {
        type?: string;
        title?: string;
        status?: number;
        detail?: string;
        message?: string;
      };
      console.error("[TOP-PRODUCTS] Error:", err.message ?? err.detail);
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
