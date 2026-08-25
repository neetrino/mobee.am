import { NextRequest, NextResponse } from "next/server";
import { authenticateToken } from "@/lib/middleware/auth";
import { usersService } from "@/lib/services/users.service";
import { runApiRoute } from "@/lib/errors/run-api-route";

export async function PUT(req: NextRequest) {
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

    const body = await req.json();
    const oldPassword = body.oldPassword || body.currentPassword;
    const { newPassword } = body;

    if (!oldPassword || typeof oldPassword !== "string" || oldPassword.trim() === "") {
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

    if (!newPassword || typeof newPassword !== "string" || newPassword.trim() === "") {
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
  });
}
