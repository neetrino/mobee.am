import { NextRequest, NextResponse } from "next/server";
import { authenticateToken, requireAdmin } from "@/lib/middleware/auth";
import { adminService } from "@/lib/services/admin.service";

function forbiddenResponse(url: string) {
  return NextResponse.json(
    {
      type: "https://api.shop.am/problems/forbidden",
      title: "Forbidden",
      status: 403,
      detail: "Admin access required",
      instance: url,
    },
    { status: 403 },
  );
}

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateToken(req);
    if (!user || !requireAdmin(user)) {
      return forbiddenResponse(req.url);
    }

    const result = await adminService.getPromoCodes();
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("❌ [ADMIN PROMOCODES GET]", error);
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
        detail:
          typedError.detail ||
          typedError.message ||
          (error instanceof Error ? error.message : "An error occurred"),
        instance: req.url,
      },
      { status: typedError.status || 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateToken(req);
    if (!user || !requireAdmin(user)) {
      return forbiddenResponse(req.url);
    }

    const body = (await req.json()) as {
      code?: string;
      discountPercent?: number;
    };

    const result = await adminService.createPromoCode({
      code: body.code || "",
      discountPercent: Number(body.discountPercent),
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    console.error("❌ [ADMIN PROMOCODES POST]", error);
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
        detail:
          typedError.detail ||
          typedError.message ||
          (error instanceof Error ? error.message : "An error occurred"),
        instance: req.url,
      },
      { status: typedError.status || 500 },
    );
  }
}
