import { NextRequest, NextResponse } from "next/server";
import { authenticateToken } from "@/lib/middleware/auth";
import { usersService } from "@/lib/services/users.service";
import { safeParseProfileUpdate } from "@/lib/schemas/users.schema";
import { runApiRoute } from "@/lib/errors/run-api-route";

export async function GET(req: NextRequest) {
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

    const result = await usersService.getProfile(user.id);
    return NextResponse.json(result);
  });
}

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
    const parsed = safeParseProfileUpdate(body);
    if (!parsed.success) {
      const detail = Object.entries(parsed.error.flatten().fieldErrors)
        .map(([field, errors]) => `${field}: ${errors?.join(", ")}`)
        .join("; ");

      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/validation-error",
          title: "Validation failed",
          status: 400,
          detail: detail || parsed.error.message,
          instance: req.url,
        },
        { status: 400 }
      );
    }

    const result = await usersService.updateProfile(user.id, parsed.data);
    return NextResponse.json(result);
  });
}

export async function DELETE(req: NextRequest) {
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

    const result = await usersService.deleteAccount(user.id);
    return NextResponse.json(result);
  });
}
