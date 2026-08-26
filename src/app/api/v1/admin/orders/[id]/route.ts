import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/middleware/admin-api-auth";
import { adminService } from "@/lib/services/admin.service";
import { runApiRoute } from "@/lib/errors/run-api-route";

/**
 * GET /api/v1/admin/orders/[id]
 * Get full order details for admin
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return runApiRoute(req, async () => {
    const authResult = await requireAdminApiContext(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id } = await params;
    const order = await adminService.getOrderById(id);
    return NextResponse.json(order);
  });
}

/**
 * PUT /api/v1/admin/orders/[id]
 * Update an order
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return runApiRoute(req, async (ctx) => {
    const authResult = await requireAdminApiContext(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id } = await params;
    const body = await req.json();
    const order = await adminService.updateOrder(
      id,
      body,
      ctx.commerce({ actorUserId: authResult.userId, source: "admin" }),
    );
    return NextResponse.json(order);
  });
}

/**
 * DELETE /api/v1/admin/orders/[id]
 * Delete an order
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return runApiRoute(req, async (ctx) => {
    const authResult = await requireAdminApiContext(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    let resolvedParams: { id: string };
    try {
      resolvedParams = await params;
    } catch {
      throw {
        status: 400,
        type: "https://api.shop.am/problems/bad-request",
        title: "Bad Request",
        detail: "Invalid order ID parameter",
      };
    }

    const orderId = resolvedParams?.id;

    if (!orderId || typeof orderId !== "string" || orderId.trim() === "") {
      throw {
        status: 400,
        type: "https://api.shop.am/problems/bad-request",
        title: "Bad Request",
        detail: "Order ID is required and must be a valid string",
      };
    }

    await adminService.deleteOrder(
      orderId,
      ctx.commerce({ actorUserId: authResult.userId, source: "admin" }),
    );

    return NextResponse.json({
      success: true,
      message: "Order deleted successfully",
    });
  });
}
