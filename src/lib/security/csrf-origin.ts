import type { NextRequest } from "next/server";
import { resolveAllowedOrigins } from "@/lib/security/cors";

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Paths that accept cross-site or provider callbacks without browser Origin. */
const CSRF_EXEMPT_PATH_PREFIXES = [
  "/api/v1/payments/callback",
  "/api/health",
] as const;

function isCsrfExemptPath(pathname: string): boolean {
  return CSRF_EXEMPT_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function originFromReferer(referer: string): string | null {
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

/**
 * Validates Origin/Referer for cookie-authenticated mutating API requests (CSRF mitigation).
 * Same-origin browser fetch with credentials always sends Origin in modern browsers.
 */
export function verifyMutationOrigin(request: NextRequest): boolean {
  if (process.env.NODE_ENV === "development") {
    return true;
  }

  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/api/") || !MUTATION_METHODS.has(request.method)) {
    return true;
  }

  if (isCsrfExemptPath(pathname)) {
    return true;
  }

  const allowed = resolveAllowedOrigins();
  if (allowed.length === 0) {
    return false;
  }

  const origin = request.headers.get("origin")?.trim();
  if (origin && allowed.includes(origin)) {
    return true;
  }

  const referer = request.headers.get("referer")?.trim();
  if (referer) {
    const refererOrigin = originFromReferer(referer);
    if (refererOrigin && allowed.includes(refererOrigin)) {
      return true;
    }
  }

  const hostOrigin = request.nextUrl.origin;
  if (allowed.includes(hostOrigin) && !origin && !referer) {
    return true;
  }

  return false;
}
