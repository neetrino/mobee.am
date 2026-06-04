import { NextResponse } from "next/server";
import {
  buildAccessTokenClearCookieHeader,
  buildAccessTokenSetCookieHeader,
} from "@/lib/security/auth-cookie";
import type { AuthResponse } from "@/lib/services/auth.service";

/**
 * JSON auth payload without token in body; JWT only in HttpOnly cookie.
 */
export function jsonAuthSession(
  result: AuthResponse,
  init?: { status?: number }
): NextResponse {
  const response = NextResponse.json(
    { user: result.user },
    { status: init?.status ?? 200 }
  );
  response.headers.append("Set-Cookie", buildAccessTokenSetCookieHeader(result.token));
  return response;
}

export function jsonLogoutSession(): NextResponse {
  const response = NextResponse.json({ ok: true });
  response.headers.append("Set-Cookie", buildAccessTokenClearCookieHeader());
  return response;
}
