import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/middleware/admin-api-auth";
import { adminService } from "@/lib/services/admin.service";
import { withAdminPerfLog } from "@/lib/admin/admin-perf-log";
import { runApiRoute } from "@/lib/errors/run-api-route";

export async function GET(req: NextRequest) {
  return runApiRoute(req, async () => {
    return withAdminPerfLog("/api/v1/admin/orders", async (markAuthComplete) => {
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
    });
  });
}
