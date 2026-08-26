import type { NextRequest } from "next/server";

function parseOriginList(raw: string | undefined): string[] {
  if (!raw?.trim()) {
    return [];
  }
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/** Allowed browser origins from env (never `*` in production). */
export function resolveAllowedOrigins(): string[] {
  const origins = new Set<string>();

  for (const entry of parseOriginList(process.env.CORS_ORIGIN)) {
    origins.add(entry);
  }

  const appUrl = process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    origins.add(appUrl);
  }

  if (process.env.NODE_ENV === "development") {
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:3000");
  }

  return [...origins];
}

function pickAccessControlAllowOrigin(
  request: NextRequest | undefined,
  allowed: string[]
): string | null {
  const requestOrigin = request?.headers.get("origin")?.trim() ?? "";

  if (requestOrigin && allowed.includes(requestOrigin)) {
    return requestOrigin;
  }

  if (allowed.length === 1) {
    return allowed[0];
  }

  if (process.env.NODE_ENV === "development") {
    return requestOrigin || allowed[0] || "http://localhost:3000";
  }

  if (allowed.length > 0) {
    return allowed[0];
  }

  const apiOrigin = request?.nextUrl.origin;
  if (requestOrigin && apiOrigin && requestOrigin === apiOrigin) {
    return requestOrigin;
  }

  return null;
}

export function getCorsHeaders(request?: NextRequest): Record<string, string> {
  const allowed = resolveAllowedOrigins();
  const allowOrigin = pickAccessControlAllowOrigin(request, allowed);

  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Request-ID",
    "Access-Control-Expose-Headers": "X-Request-ID, X-Cache",
    "Access-Control-Max-Age": "86400",
  };

  if (allowOrigin) {
    headers["Access-Control-Allow-Origin"] = allowOrigin;
    headers["Access-Control-Allow-Credentials"] = "true";
  }

  return headers;
}
