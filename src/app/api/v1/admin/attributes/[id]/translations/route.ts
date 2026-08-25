import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/middleware/admin-api-auth";
import { adminService } from "@/lib/services/admin.service";
import { runApiRoute } from "@/lib/errors/run-api-route";

/**
 * PATCH /api/v1/admin/attributes/[id]/translations
 * Update attribute translation (name)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return runApiRoute(req, async () => {
    const authResult = await requireAdminApiContext(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id: attributeId } = await params;
    const body = await req.json();

    const result = await adminService.updateAttributeTranslation(attributeId, {
      name: body.name,
      locale: body.locale || "en",
    });

    return NextResponse.json({ data: result }, { status: 200 });
  });
}
