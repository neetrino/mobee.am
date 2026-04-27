import { NextRequest, NextResponse } from "next/server";
import { authenticateToken } from "@/lib/middleware/auth";
import { toApiError } from "@/lib/types/errors";
import { logger } from "@/lib/utils/logger";

/**
 * GET /api/v1/users/roles
 * Lightweight roles for session hydration (avoids full profile + addresses)
 */
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

    return NextResponse.json({ roles: user.roles });
  } catch (error: unknown) {
    logger.error("Users roles error", { error });
    const apiError = toApiError(error, req.url);
    return NextResponse.json(apiError, { status: apiError.status || 500 });
  }
}
