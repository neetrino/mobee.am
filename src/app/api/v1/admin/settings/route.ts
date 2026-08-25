import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/middleware/admin-api-auth";
import { adminService } from "@/lib/services/admin.service";
import {
  getCachedAdminReferenceResponse,
  invalidateAdminReferenceServerCache,
} from "@/lib/admin/admin-reference-server-cache";
import { runApiRoute } from "@/lib/errors/run-api-route";

export async function GET(req: NextRequest) {
  return runApiRoute(req, async () => {
    const authResult = await requireAdminApiContext(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const result = await getCachedAdminReferenceResponse("settings", () =>
      adminService.getSettings(),
    );
    return NextResponse.json(result);
  });
}

export async function PUT(req: NextRequest) {
  return runApiRoute(req, async () => {
    const authResult = await requireAdminApiContext(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const data = await req.json();
    const result = await adminService.updateSettings(data);
    await invalidateAdminReferenceServerCache("settings");
    return NextResponse.json(result);
  });
}
