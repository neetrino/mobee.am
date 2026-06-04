import type { NextRequest } from "next/server";

/** Dev: plain name. Prod HTTPS: __Host- prefix (no Domain, Path=/, Secure). */
export function getAccessTokenCookieName(): string {
  return process.env.NODE_ENV === "production"
    ? "__Host-access_token"
    : "access_token";
}

const DEFAULT_MAX_AGE_SEC = 7 * 24 * 60 * 60;

/**
 * Parse JWT_EXPIRES_IN (e.g. `7d`, `12h`, `3600`) to cookie Max-Age seconds.
 */
export function getAccessTokenMaxAgeSeconds(): number {
  const raw = process.env.JWT_EXPIRES_IN?.trim();
  if (!raw) {
    return DEFAULT_MAX_AGE_SEC;
  }

  const match = /^(\d+)([dhms])?$/i.exec(raw);
  if (!match) {
    return DEFAULT_MAX_AGE_SEC;
  }

  const value = Number(match[1]);
  const unit = (match[2] ?? "s").toLowerCase();
  const multipliers: Record<string, number> = {
    d: 86400,
    h: 3600,
    m: 60,
    s: 1,
  };
  return value * (multipliers[unit] ?? 1);
}

function buildCookieValue(token: string, maxAgeSec: number): string {
  const name = getAccessTokenCookieName();
  const secure = process.env.NODE_ENV === "production";
  const parts = [
    `${name}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    `Max-Age=${maxAgeSec}`,
    "SameSite=Lax",
  ];
  if (secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

export function buildAccessTokenSetCookieHeader(token: string): string {
  return buildCookieValue(token, getAccessTokenMaxAgeSeconds());
}

export function buildAccessTokenClearCookieHeader(): string {
  const name = getAccessTokenCookieName();
  const secure = process.env.NODE_ENV === "production";
  const parts = [
    `${name}=`,
    "Path=/",
    "HttpOnly",
    "Max-Age=0",
    "SameSite=Lax",
  ];
  if (secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

export function getAccessTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const bearer = authHeader.slice(7).trim();
    if (bearer) {
      return bearer;
    }
  }

  const cookieValue = request.cookies.get(getAccessTokenCookieName())?.value;
  if (!cookieValue) {
    return null;
  }

  try {
    return decodeURIComponent(cookieValue);
  } catch {
    return cookieValue;
  }
}
