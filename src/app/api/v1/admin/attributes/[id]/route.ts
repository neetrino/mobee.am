import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/middleware/admin-api-auth";
import { adminService } from "@/lib/services/admin.service";
import { runApiRoute } from "@/lib/errors/run-api-route";

/**
 * DELETE /api/v1/admin/attributes/[id]
 * Delete an attribute
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return runApiRoute(req, async () => {
    const authResult = await requireAdminApiContext(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id } = await params;
    const result = await adminService.deleteAttribute(id);
    return NextResponse.json(result, { status: 200 });
  });
}
