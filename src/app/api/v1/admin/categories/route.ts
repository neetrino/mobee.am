import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/middleware/admin-api-auth";
import { adminService } from "@/lib/services/admin.service";
import { withAdminPerfLog } from "@/lib/admin/admin-perf-log";
import {
  getCachedAdminReferenceResponse,
  invalidateAdminReferenceServerCache,
} from "@/lib/admin/admin-reference-server-cache";
import { runApiRoute } from "@/lib/errors/run-api-route";

/**
 * GET /api/v1/admin/categories
 * Get list of categories
 */
export async function GET(req: NextRequest) {
  return runApiRoute(req, async () => {
    return withAdminPerfLog("/api/v1/admin/categories", async (markAuthComplete) => {
      const authResult = await requireAdminApiContext(req);
      if (authResult instanceof NextResponse) {
        return authResult;
      }
      markAuthComplete(authResult.source);

      const result = await getCachedAdminReferenceResponse("categories", () =>
        adminService.getCategories(),
      );
      return NextResponse.json(result);
    });
  });
}

/**
 * POST /api/v1/admin/categories
 * Create a new category
 */
export async function POST(req: NextRequest) {
  return runApiRoute(req, async () => {
    const authResult = await requireAdminApiContext(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const body = await req.json();
    const result = await adminService.createCategory(body);
    await invalidateAdminReferenceServerCache("categories");

    return NextResponse.json(result, { status: 201 });
  });
}
