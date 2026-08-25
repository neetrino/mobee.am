import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/middleware/admin-api-auth";
import { adminService } from "@/lib/services/admin.service";
import { runApiRoute } from "@/lib/errors/run-api-route";

/**
 * PATCH /api/v1/admin/products/[id]/discount
 * Update product discount percentage
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

    const { id } = await params;
    const body = await req.json();
    const discountPercent = body.discountPercent;

    if (typeof discountPercent !== "number" || discountPercent < 0 || discountPercent > 100) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/validation-error",
          title: "Validation Error",
          status: 400,
          detail: "discountPercent must be a number between 0 and 100",
          instance: req.url,
        },
        { status: 400 }
      );
    }

    const result = await adminService.updateProductDiscount(id, discountPercent);

    return NextResponse.json({ success: true, discountPercent: result.discountPercent });
  });
}
