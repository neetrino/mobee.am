import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/lib/services/auth.service";
import { toApiError } from "@/lib/types/errors";
import { logger } from "@/lib/utils/logger";
import { safeParseLogin } from "@/lib/schemas/auth.schema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = safeParseLogin(body);
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const detail = Object.entries(first)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
        .join("; ") || parsed.error.message;
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/validation-error",
          title: "Validation failed",
          status: 400,
          detail,
          instance: req.url,
        },
        { status: 400 }
      );
    }
    const result = await authService.login(parsed.data);
    return NextResponse.json(result);
  } catch (error: unknown) {
    logger.error("Login error", { error });
    const apiError = toApiError(error, req.url);
    return NextResponse.json(apiError, { status: apiError.status || 500 });
  }
}

