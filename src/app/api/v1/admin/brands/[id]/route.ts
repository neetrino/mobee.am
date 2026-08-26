import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/middleware/admin-api-auth";
import { adminService } from "@/lib/services/admin.service";
import { invalidateAdminReferenceServerCache } from "@/lib/admin/admin-reference-server-cache";
import { runApiRoute } from "@/lib/errors/run-api-route";
import { invalidateHomeBrandsCache } from "@/lib/services/home-brands-cached";

/**
 * PUT /api/v1/admin/brands/[id]
 * Update a brand
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return runApiRoute(req, async () => {
    const authResult = await requireAdminApiContext(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id } = await params;
    const body = await req.json();
    const result = await adminService.updateBrand(id, body);
    await invalidateAdminReferenceServerCache("brands");
    await invalidateHomeBrandsCache();

    return NextResponse.json(result);
  });
}

/**
 * DELETE /api/v1/admin/brands/[id]
 * Delete a brand (soft delete)
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
    await adminService.deleteBrand(id);
    await invalidateAdminReferenceServerCache("brands");
    await invalidateHomeBrandsCache();

    return NextResponse.json({ success: true });
  });
}
