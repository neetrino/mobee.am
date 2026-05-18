import { NextRequest, NextResponse } from "next/server";
import { resetPasswordByToken } from "@/lib/services/password-reset.service";
import { safeParseResetPassword } from "@/lib/schemas/auth.schema";
import { toApiError } from "@/lib/types/errors";
import { logger } from "@/lib/utils/logger";

function validationErrorResponse(
  req: NextRequest,
  parsed: ReturnType<typeof safeParseResetPassword>
) {
  if (parsed.success) {
    return null;
  }
  const first = parsed.error.flatten().fieldErrors;
  const detail =
    Object.entries(first)
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = safeParseResetPassword(body);
    const validationError = validationErrorResponse(req, parsed);
    if (validationError || !parsed.success) {
      return validationError!;
    }

    const result = await resetPasswordByToken(
      parsed.data.token,
      parsed.data.newPassword
    );
    return NextResponse.json(result);
  } catch (error: unknown) {
    logger.error("Reset password error", { error });
    const apiError = toApiError(error, req.url);
    return NextResponse.json(apiError, { status: apiError.status || 500 });
  }
}
