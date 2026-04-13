import { NextRequest, NextResponse } from "next/server";
import { authenticateToken } from "@/lib/middleware/auth";
import { usersService } from "@/lib/services/users.service";
import { toApiError } from "@/lib/types/errors";
import { logger } from "@/lib/utils/logger";

export async function PUT(req: NextRequest) {
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

    const body = await req.json();
    // Support both 'oldPassword' and 'currentPassword' field names
    const oldPassword = body.oldPassword || body.currentPassword;
    const { newPassword } = body;

    // Validate required fields
    if (!oldPassword || typeof oldPassword !== 'string' || oldPassword.trim() === '') {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/validation-error",
          title: "Validation Error",
          status: 400,
          detail: "Current password (oldPassword or currentPassword) is required",
          instance: req.url,
        },
        { status: 400 }
      );
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.trim() === '') {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/validation-error",
          title: "Validation Error",
          status: 400,
          detail: "New password is required",
          instance: req.url,
        },
        { status: 400 }
      );
    }

    // Validate password length
    if (newPassword.length < 6) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/validation-error",
          title: "Validation Error",
          status: 400,
          detail: "New password must be at least 6 characters long",
          instance: req.url,
        },
        { status: 400 }
      );
    }

    const result = await usersService.changePassword(user.id, oldPassword.trim(), newPassword.trim());
    return NextResponse.json(result);
  } catch (error: unknown) {
    logger.error("Password change error", { error });
    if (error instanceof Error) {
      logger.error("Password change error details", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
    }
    const apiError = toApiError(error, req.url);
    return NextResponse.json(apiError, { status: apiError.status || 500 });
  }
}

