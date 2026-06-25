import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/middleware/admin-api-auth";
import { adminService } from "@/lib/services/admin.service";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await requireAdminApiContext(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id } = await params;
    const body = (await req.json()) as { isActive?: boolean };

    if (typeof body.isActive !== "boolean") {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/validation-error",
          title: "Validation Error",
          status: 400,
          detail: "isActive must be a boolean",
          instance: req.url,
        },
        { status: 400 },
      );
    }

    const result = await adminService.updatePromoCodeStatus(id, {
      isActive: body.isActive,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const typedError = error as {
      type?: string;
      title?: string;
      status?: number;
      detail?: string;
      message?: string;
    };

    return NextResponse.json(
      {
        type: typedError.type || "https://api.shop.am/problems/internal-error",
        title: typedError.title || "Internal Server Error",
        status: typedError.status || 500,
        detail: typedError.detail || typedError.message || "An error occurred",
        instance: req.url,
      },
      { status: typedError.status || 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await requireAdminApiContext(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id } = await params;
    const result = await adminService.deletePromoCode(id);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const typedError = error as {
      type?: string;
      title?: string;
      status?: number;
      detail?: string;
      message?: string;
    };

    return NextResponse.json(
      {
        type: typedError.type || "https://api.shop.am/problems/internal-error",
        title: typedError.title || "Internal Server Error",
        status: typedError.status || 500,
        detail: typedError.detail || typedError.message || "An error occurred",
        instance: req.url,
      },
      { status: typedError.status || 500 },
    );
  }
}
