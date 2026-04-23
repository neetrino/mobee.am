import { NextRequest, NextResponse } from "next/server";
import { authenticateToken } from "@/lib/middleware/auth";
import { safeParseAddressCreate } from "@/lib/schemas/users.schema";
import { usersService } from "@/lib/services/users.service";
import { toApiError } from "@/lib/types/errors";
import { logger } from "@/lib/utils/logger";

export async function GET(req: NextRequest) {
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

    const result = await usersService.getAddresses(user.id);
    return NextResponse.json(result);
  } catch (error: unknown) {
    logger.error("Users addresses error", { error });
    const apiError = toApiError(error, req.url);
    return NextResponse.json(apiError, { status: apiError.status || 500 });
  }
}

export async function POST(req: NextRequest) {
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
    const parsed = safeParseAddressCreate(body);
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

    const result = await usersService.addAddress(user.id, parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    logger.error("Users addresses error", { error });
    const apiError = toApiError(error, req.url);
    return NextResponse.json(apiError, { status: apiError.status || 500 });
  }
}

