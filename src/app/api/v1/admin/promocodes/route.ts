import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/middleware/admin-api-auth";
import { adminService } from "@/lib/services/admin.service";
import { runApiRoute } from "@/lib/errors/run-api-route";

export async function GET(req: NextRequest) {
  return runApiRoute(req, async () => {
    const authResult = await requireAdminApiContext(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const result = await adminService.getPromoCodes();
    return NextResponse.json(result);
  });
}

export async function POST(req: NextRequest) {
  return runApiRoute(req, async () => {
    const authResult = await requireAdminApiContext(req);
    if (authResult instanceof NextResponse) {
      return authResult;
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
  });
}
