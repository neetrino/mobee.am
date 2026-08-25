import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/middleware/admin-api-auth";
import { adminService } from "@/lib/services/admin.service";
import {
  getCachedAdminReferenceResponse,
  invalidateAdminReferenceServerCache,
} from "@/lib/admin/admin-reference-server-cache";
import { runApiRoute } from "@/lib/errors/run-api-route";

/**
 * GET /api/v1/admin/delivery
 * Get delivery settings
 */
export async function GET(req: NextRequest) {
  return runApiRoute(req, async () => {
    const authResult = await requireAdminApiContext(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const settings = await getCachedAdminReferenceResponse("delivery", () =>
      adminService.getDeliverySettings(),
    );

    return NextResponse.json(settings);
  });
}

/**
 * PUT /api/v1/admin/delivery
 * Update delivery settings
 */
export async function PUT(req: NextRequest) {
  return runApiRoute(req, async () => {
    const authResult = await requireAdminApiContext(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const body = await req.json();
    const settings = await adminService.updateDeliverySettings(body);
    await invalidateAdminReferenceServerCache("delivery");

    return NextResponse.json(settings);
  });
}
