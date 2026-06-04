import { jsonLogoutSession } from "@/lib/security/auth-session-response";

/**
 * POST /api/v1/auth/logout
 * Clears HttpOnly access token cookie.
 */
export async function POST() {
  return jsonLogoutSession();
}
