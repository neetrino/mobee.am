import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/middleware/admin-api-auth";
import { safeParseAdminUserUpdate } from "@/lib/schemas/admin-users.schema";
import { adminService } from "@/lib/services/admin.service";

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
    const parsed = safeParseAdminUserUpdate(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/validation-error",
          title: "Validation Error",
          status: 400,
          detail: parsed.error.issues.map((issue) => issue.message).join("; ") || "Invalid payload",
          instance: req.url,
        },
        { status: 400 }
      );
    }
    const result = await adminService.updateUser(id, parsed.data);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("❌ [ADMIN] Error:", error);
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
    await adminService.deleteUser(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("❌ [ADMIN] Delete user error:", error);
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

