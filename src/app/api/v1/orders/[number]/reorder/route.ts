import { NextRequest, NextResponse } from "next/server";
import { authenticateToken } from "@/lib/middleware/auth";
import { ordersService } from "@/lib/services/orders.service";
import { runApiRoute } from "@/lib/errors/run-api-route";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ number: string }> }
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

    const { number } = await params;
    const result = await ordersService.reorder(number, user.id);
    return NextResponse.json(result, { status: 200 });
  });
}
