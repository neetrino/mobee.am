import { NextRequest } from "next/server";
import { jsonAuthSession } from "@/lib/security/auth-session-response";
import { authService } from "@/lib/services/auth.service";
import { AppError } from "@/lib/errors/app-error";
import { runApiRoute } from "@/lib/errors/run-api-route";
import { safeParseLogin } from "@/lib/schemas/auth.schema";

export async function POST(req: NextRequest) {
  return runApiRoute(req, async () => {
    const body = await req.json();
    const parsed = safeParseLogin(body);
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const detail =
        Object.entries(first)
          .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`)
          .join("; ") || "Validation failed";
      throw AppError.badRequest(detail);
    }
    const result = await authService.login(parsed.data);
    return jsonAuthSession(result);
  });
}
