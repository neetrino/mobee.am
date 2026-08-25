import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/middleware/admin-api-auth";
import { adminService } from "@/lib/services/admin.service";
import { withAdminPerfLog } from "@/lib/admin/admin-perf-log";
import { runApiRoute } from "@/lib/errors/run-api-route";

export async function GET(req: NextRequest) {
  return runApiRoute(req, async () => {
    return withAdminPerfLog("/api/v1/admin/users", async (markAuthComplete) => {
      const authResult = await requireAdminApiContext(req);
      if (authResult instanceof NextResponse) {
        return authResult;
      }
      markAuthComplete(authResult.source);

      const searchParams = req.nextUrl.searchParams;
      const page = parseInt(searchParams.get("page") || "1", 10);
      const limit = parseInt(searchParams.get("limit") || "20", 10);
      const search = searchParams.get("search") || undefined;
      const role = searchParams.get("role") || undefined;

      const result = await adminService.getUsers({
        page: Number.isFinite(page) ? page : 1,
        limit: Number.isFinite(limit) ? limit : 20,
        search: search?.trim() || undefined,
        role: role?.trim() || undefined,
      });

      return NextResponse.json(result);
    });
  });
}
