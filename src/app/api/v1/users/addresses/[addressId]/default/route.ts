import { NextRequest, NextResponse } from "next/server";
import { authenticateToken } from "@/lib/middleware/auth";
import { usersService } from "@/lib/services/users.service";
import { runApiRoute } from "@/lib/errors/run-api-route";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ addressId: string }> }
) {
  return runApiRoute(req, async () => {
    const user = await authenticateToken(req);
    if (!user) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/unauthorized",
          title: "Unauthorized",
          status: 401,
          detail: "Authentication token required",
          instance: req.url,
        },
        { status: 401 }
      );
    }

    const { addressId } = await params;
    const result = await usersService.setDefaultAddress(user.id, addressId);
    return NextResponse.json(result);
  });
}
