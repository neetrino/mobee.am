import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/middleware/admin-api-auth";
import { adminService } from "@/lib/services/admin.service";
import { runApiRoute } from "@/lib/errors/run-api-route";

/**
 * GET /api/v1/admin/attributes
 * Get list of attributes
 */
export async function GET(req: NextRequest) {
  return runApiRoute(req, async () => {
    const authResult = await requireAdminApiContext(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const result = await adminService.getAttributes();
    return NextResponse.json(result);
  });
}

/**
 * POST /api/v1/admin/attributes
 * Create a new attribute
 */
export async function POST(req: NextRequest) {
  return runApiRoute(req, async () => {
    const authResult = await requireAdminApiContext(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const body = await req.json();
    const result = await adminService.createAttribute(body);
    return NextResponse.json({ data: result }, { status: 201 });
  });
}
