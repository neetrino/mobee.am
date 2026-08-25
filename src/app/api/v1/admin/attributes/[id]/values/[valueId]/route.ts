import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/middleware/admin-api-auth";
import { adminService } from "@/lib/services/admin.service";
import { runApiRoute } from "@/lib/errors/run-api-route";

/**
 * PATCH /api/v1/admin/attributes/[id]/values/[valueId]
 * Update an attribute value
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; valueId: string }> }
) {
  return runApiRoute(req, async () => {
    const authResult = await requireAdminApiContext(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id: attributeId, valueId } = await params;
    const body = await req.json();

    const result = await adminService.updateAttributeValue(attributeId, valueId, {
      label: body.label,
      colors: body.colors,
      imageUrl: body.imageUrl,
      locale: body.locale || "en",
    });

    return NextResponse.json({ data: result }, { status: 200 });
  });
}

/**
 * DELETE /api/v1/admin/attributes/[id]/values/[valueId]
 * Delete an attribute value
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; valueId: string }> }
) {
  return runApiRoute(req, async () => {
    const authResult = await requireAdminApiContext(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { valueId } = await params;
    const result = await adminService.deleteAttributeValue(valueId);
    return NextResponse.json({ data: result }, { status: 200 });
  });
}
