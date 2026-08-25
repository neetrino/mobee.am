import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/middleware/admin-api-auth";
import { adminService } from "@/lib/services/admin.service";
import {
  getCachedAdminReferenceResponse,
  invalidateAdminReferenceServerCache,
} from "@/lib/admin/admin-reference-server-cache";
import { runApiRoute } from "@/lib/errors/run-api-route";

/**
 * GET /api/v1/admin/brands
 * Get list of brands
 */
export async function GET(req: NextRequest) {
  return runApiRoute(req, async () => {
    const authResult = await requireAdminApiContext(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const result = await getCachedAdminReferenceResponse("brands", () =>
      adminService.getBrands(),
    );
    return NextResponse.json(result);
  });
}

/**
 * POST /api/v1/admin/brands
 * Create a new brand
 */
export async function POST(req: NextRequest) {
  return runApiRoute(req, async () => {
    const authResult = await requireAdminApiContext(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const body = await req.json();
    const result = await adminService.createBrand(body);
    await invalidateAdminReferenceServerCache("brands");

    return NextResponse.json(result, { status: 201 });
  });
}
