import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/middleware/admin-api-auth";
import { adminService } from "@/lib/services/admin.service";
import { withAdminPerfLog } from "@/lib/admin/admin-perf-log";

export async function GET(req: NextRequest) {
  return withAdminPerfLog("/api/v1/admin/orders", async (markAuthComplete) => {
    try {
      const authResult = await requireAdminApiContext(req);
      if (authResult instanceof NextResponse) {
        return authResult;
      }
      markAuthComplete(authResult.source);

      const searchParams = req.nextUrl.searchParams;
      const page = parseInt(searchParams.get("page") || "1", 10);
      const limit = parseInt(searchParams.get("limit") || "20", 10);
      const status = searchParams.get("status") || undefined;
      const paymentStatus = searchParams.get("paymentStatus") || undefined;
      const fulfillmentStatus = searchParams.get("fulfillmentStatus") || undefined;
      const search = searchParams.get("search") || undefined;
      const sortBy = searchParams.get("sortBy") || undefined;
      const sortOrder = searchParams.get("sortOrder") || undefined;

      const filters = {
        page,
        limit,
        ...(status && { status }),
        ...(paymentStatus && { paymentStatus }),
        ...(fulfillmentStatus && { fulfillmentStatus }),
        ...(search && { search }),
        ...(sortBy && { sortBy }),
        ...(sortOrder && { sortOrder: sortOrder as "asc" | "desc" }),
      };

      const result = await adminService.getOrders(filters);
      return NextResponse.json(result);
    } catch (error: unknown) {
      const err = error as {
        type?: string;
        title?: string;
        status?: number;
        detail?: string;
        message?: string;
      };
      console.error("[ADMIN ORDERS] Error:", err.message ?? err.detail);
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
