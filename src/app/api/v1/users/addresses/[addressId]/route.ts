import { NextRequest, NextResponse } from "next/server";
import { authenticateToken } from "@/lib/middleware/auth";
import { usersService } from "@/lib/services/users.service";
import { toApiError } from "@/lib/types/errors";
import { logger } from "@/lib/utils/logger";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ addressId: string }> }
) {
  try {
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
    const data = await req.json();
    const result = await usersService.updateAddress(user.id, addressId, data);
    return NextResponse.json(result);
  } catch (error: unknown) {
    logger.error("Users addresses error", { error });
    const apiError = toApiError(error, req.url);
    return NextResponse.json(apiError, { status: apiError.status || 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ addressId: string }> }
) {
  try {
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
    await usersService.deleteAddress(user.id, addressId);
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    logger.error("Users addresses error", { error });
    const apiError = toApiError(error, req.url);
    return NextResponse.json(apiError, { status: apiError.status || 500 });
  }
}

