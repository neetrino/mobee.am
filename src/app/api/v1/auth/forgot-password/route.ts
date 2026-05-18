import { NextRequest, NextResponse } from "next/server";
import { requestPasswordReset } from "@/lib/services/password-reset.service";
import { safeParseForgotPassword } from "@/lib/schemas/auth.schema";
import { toApiError } from "@/lib/types/errors";
import { logger } from "@/lib/utils/logger";

function validationErrorResponse(
  req: NextRequest,
  parsed: ReturnType<typeof safeParseForgotPassword>
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
    const parsed = safeParseForgotPassword(body);
    const validationError = validationErrorResponse(req, parsed);
    if (validationError || !parsed.success) {
      return validationError!;
    }

    const result = await requestPasswordReset(parsed.data.email);
    return NextResponse.json(result);
  } catch (error: unknown) {
    logger.error("Forgot password error", { error });
    const apiError = toApiError(error, req.url);
    return NextResponse.json(apiError, { status: apiError.status || 500 });
  }
}
