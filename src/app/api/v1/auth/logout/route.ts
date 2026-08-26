import { jsonLogoutSession } from "@/lib/security/auth-session-response";
import { runApiRoute } from "@/lib/errors/run-api-route";
import { NextRequest } from "next/server";

/**
 * POST /api/v1/auth/logout
 * Clears HttpOnly access token cookie.
 */
export async function POST(req: NextRequest) {
  return runApiRoute(req, async () => jsonLogoutSession());
}
