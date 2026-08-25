import { NextRequest, NextResponse } from "next/server";
import { authenticateToken } from "@/lib/middleware/auth";
import { cartService } from "@/lib/services/cart.service";
import { runApiRoute } from "@/lib/errors/run-api-route";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    const data = await req.json();
    const result = await cartService.updateItem(user.id, id, data.quantity);
    return NextResponse.json(result);
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    await cartService.removeItem(user.id, id);
    return new NextResponse(null, { status: 204 });
  });
}
