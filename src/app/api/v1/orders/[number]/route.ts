import { NextRequest, NextResponse } from "next/server";
import { authenticateToken } from "@/lib/middleware/auth";
import { ordersService } from "@/lib/services/orders.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  let user: { id: string } | null = null;
  try {
    const { number } = await params;
    user = await authenticateToken(req);

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
  } catch (error: unknown) {
    const { number } = await params;
    const err = error as {
      message?: string;
      stack?: string;
      name?: string;
      type?: string;
      title?: string;
      status?: number;
      detail?: string;
    };
    console.error("❌ [ORDERS] Get order by number error:", {
      orderNumber: number,
      userId: user?.id,
      message: err.message,
      stack: err.stack,
      name: err.name,
      type: err.type,
      title: err.title,
      status: err.status,
      detail: err.detail,
      fullError: error,
    });
    return NextResponse.json(
      {
        type: err.type || "https://api.shop.am/problems/internal-error",
        title: err.title || "Internal Server Error",
        status: err.status || 500,
        detail: err.detail || err.message || "An error occurred",
        instance: req.url,
      },
      { status: err.status || 500 }
    );
  }
}
