import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/middleware/admin-api-auth";
import { adminService } from "@/lib/services/admin.service";
import { invalidateAdminReferenceServerCache } from "@/lib/admin/admin-reference-server-cache";
import { runApiRoute } from "@/lib/errors/run-api-route";

/**
 * GET /api/v1/admin/categories/[id]
 * Get a single category by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return runApiRoute(req, async () => {
    const authResult = await requireAdminApiContext(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id } = await params;
    const category = await adminService.getCategoryById(id);

    if (!category) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/not-found",
          title: "Category not found",
          status: 404,
          detail: `Category with id '${id}' does not exist`,
          instance: req.url,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: category });
  });
}

/**
 * PUT /api/v1/admin/categories/[id]
 * Update a category
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
    const result = await adminService.updateCategory(id, body);
    await invalidateAdminReferenceServerCache("categories");

    return NextResponse.json(result);
  });
}

/**
 * DELETE /api/v1/admin/categories/[id]
 * Delete a category (soft delete)
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
    await adminService.deleteCategory(id);
    await invalidateAdminReferenceServerCache("categories");

    return NextResponse.json({ success: true });
  });
}
