import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/middleware/admin-api-auth";
import { safeParseAdminUserUpdate } from "@/lib/schemas/admin-users.schema";
import { adminService } from "@/lib/services/admin.service";
import { runApiRoute } from "@/lib/errors/run-api-route";

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
  });
}

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
    await adminService.deleteUser(id);

    return NextResponse.json({ success: true });
  });
}
