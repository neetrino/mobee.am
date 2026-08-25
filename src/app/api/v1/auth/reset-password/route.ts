import { NextRequest, NextResponse } from "next/server";
import { resetPasswordByToken } from "@/lib/services/password-reset.service";
import { safeParseResetPassword } from "@/lib/schemas/auth.schema";
import { AppError } from "@/lib/errors/app-error";
import { runApiRoute } from "@/lib/errors/run-api-route";

export async function POST(req: NextRequest) {
  return runApiRoute(req, async () => {
    const body = await req.json();
    const parsed = safeParseResetPassword(body);
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const detail =
        Object.entries(first)
          .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`)
          .join("; ") || "Validation failed";
      throw AppError.badRequest(detail);
    }
    const result = await resetPasswordByToken(parsed.data.token, parsed.data.newPassword);
    return NextResponse.json(result);
  });
}
