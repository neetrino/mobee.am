import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/middleware/admin-api-auth";
import { adminService } from "@/lib/services/admin.service";
import { invalidateAdminReferenceServerCache } from "@/lib/admin/admin-reference-server-cache";

/**
 * PUT /api/v1/admin/brands/[id]
 * Update a brand
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAdminApiContext(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id } = await params;
    const body = await req.json();
    console.log("📤 [ADMIN BRANDS] PUT request:", { id, body });

    const result = await adminService.updateBrand(id, body);
    await invalidateAdminReferenceServerCache("brands");

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("❌ [ADMIN BRANDS] PUT Error:", error);
    return NextResponse.json(
      {
        type: error.type || "https://api.shop.am/problems/internal-error",
        title: error.title || "Internal Server Error",
        status: error.status || 500,
        detail: error.detail || error.message || "An error occurred",
        instance: req.url,
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * DELETE /api/v1/admin/brands/[id]
 * Delete a brand (soft delete)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAdminApiContext(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id } = await params;
    console.log("🗑️ [ADMIN BRANDS] DELETE request:", id);

    await adminService.deleteBrand(id);
    await invalidateAdminReferenceServerCache("brands");

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("❌ [ADMIN BRANDS] DELETE Error:", error);
    return NextResponse.json(
      {
        type: error.type || "https://api.shop.am/problems/internal-error",
        title: error.title || "Internal Server Error",
        status: error.status || 500,
        detail: error.detail || error.message || "An error occurred",
        instance: req.url,
      },
      { status: error.status || 500 }
    );
  }
}

