import { NextRequest, NextResponse } from "next/server";
import { authenticateToken } from "@/lib/middleware/auth";
import { ordersService } from "@/lib/services/orders.service";
import { runApiRoute } from "@/lib/errors/run-api-route";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  return runApiRoute(req, async () => {
    const { number } = await params;
    const user = await authenticateToken(req);

    if (user) {
      const result = await ordersService.findByNumber(number, user.id);
      return NextResponse.json(result);
    }

    const email = req.nextUrl.searchParams.get("email")?.trim();
    if (!email) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/validation-error",
          title: "Validation Error",
          status: 400,
          detail: "Email is required to view a guest order",
          instance: req.url,
        },
        { status: 400 }
      );
    }

    const result = await ordersService.findByNumberForGuest(number, email);
    return NextResponse.json(result);
  });
}
