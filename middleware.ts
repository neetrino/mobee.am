import { NextRequest, NextResponse } from "next/server";
import * as jose from "jose";
import { getAccessTokenFromRequest } from "@/lib/security/auth-cookie";
import { getCorsHeaders } from "@/lib/security/cors";
import { verifyMutationOrigin } from "@/lib/security/csrf-origin";
import { assertProductionSecurityEnv } from "@/lib/security/env";
import { JWT_ALGORITHM } from "@/lib/security/jwt.constants";
import { resolveAdminGateFromJwtPayload, type AccessTokenPayload } from "@/lib/security/jwt-payload";
import {
  setTrustedAdminHeaders,
  stripTrustedAdminHeaders,
} from "@/lib/middleware/admin-context-headers";
import {
  checkRateLimitByIp,
  checkRateLimitByIpAndSuffix,
  RATE_LIMIT_AUTH,
  RATE_LIMIT_CONTACT,
  RATE_LIMIT_GUEST_ORDER,
  RATE_LIMIT_GUEST_ORDER_EMAIL,
  RATE_LIMIT_PASSWORD,
} from "@/lib/security/rate-limit";

type AdminAuthResult =
  | { ok: true; userId: string; roles: string[] }
  | { ok: false; response: NextResponse };

/** Protect /api/v1/admin/* — valid JWT + admin role in token claims. */
async function requireAdminAuth(request: NextRequest): Promise<AdminAuthResult> {
  const cleanedHeaders = stripTrustedAdminHeaders(request.headers);
  const token = getAccessTokenFromRequest(
    new NextRequest(request.url, { headers: cleanedHeaders, method: request.method }),
  );

  if (!token) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          type: "https://api.shop.am/problems/unauthorized",
          title: "Unauthorized",
          status: 401,
          detail: "Missing or invalid session",
        },
        { status: 401 },
      ),
    };
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          type: "https://api.shop.am/problems/internal-error",
          title: "Internal Server Error",
          status: 500,
          detail: "Server configuration error",
        },
        { status: 500 },
      ),
    };
  }

  try {
    const key = new TextEncoder().encode(secret);
    const { payload } = await jose.jwtVerify(token, key, {
      algorithms: [JWT_ALGORITHM],
    });

    const gate = resolveAdminGateFromJwtPayload(payload);
    if (gate === "deny") {
      return {
        ok: false,
        response: NextResponse.json(
          {
            type: "https://api.shop.am/problems/forbidden",
            title: "Forbidden",
            status: 403,
            detail: "Admin access required",
          },
          { status: 403 },
        ),
      };
    }

    const userId = (payload as AccessTokenPayload).userId?.trim();
    const roles = (payload as AccessTokenPayload).roles;
    if (!userId || !Array.isArray(roles) || roles.length === 0) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            type: "https://api.shop.am/problems/unauthorized",
            title: "Unauthorized",
            status: 401,
            detail: "Invalid or expired token",
          },
          { status: 401 },
        ),
      };
    }

    return { ok: true, userId, roles };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        {
          type: "https://api.shop.am/problems/unauthorized",
          title: "Unauthorized",
          status: 401,
          detail: "Invalid or expired token",
        },
        { status: 401 },
      ),
    };
  }
}

function isGuestOrderLookup(request: NextRequest): boolean {
  if (request.method !== "GET") {
    return false;
  }

  const match = request.nextUrl.pathname.match(/^\/api\/v1\/orders\/([^/]+)$/);
  if (!match || match[1] === "checkout") {
    return false;
  }

  return Boolean(request.nextUrl.searchParams.get("email")?.trim());
}

async function hashGuestOrderEmailKey(email: string): Promise<string> {
  const data = new TextEncoder().encode(email.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hex = Array.from(new Uint8Array(hashBuffer), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  return hex.slice(0, 24);
}

function isPasswordResetPath(pathname: string, method: string): boolean {
  if (pathname === "/api/v1/auth/forgot-password" && method === "POST") {
    return true;
  }
  if (pathname === "/api/v1/auth/reset-password" && method === "POST") {
    return true;
  }
  if (pathname === "/api/v1/auth/validate-reset-token" && method === "GET") {
    return true;
  }
  return false;
}

function applyCors(
  response: NextResponse,
  request: NextRequest
): NextResponse {
  const corsHeaders = getCorsHeaders(request);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

function csrfForbiddenResponse(): NextResponse {
  return NextResponse.json(
    {
      type: "https://api.shop.am/problems/forbidden",
      title: "Forbidden",
      status: 403,
      detail: "Cross-site request blocked",
    },
    { status: 403 }
  );
}

function isAdminPageRoute(pathname: string): boolean {
  return pathname === "/supersudo" || pathname.startsWith("/supersudo/");
}

function forwardWithAdminPageHeader(request: NextRequest): NextResponse {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-mobee-admin-route", "1");
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export async function middleware(request: NextRequest) {
  assertProductionSecurityEnv();

  const pathname = request.nextUrl.pathname;

  if (isAdminPageRoute(pathname)) {
    return forwardWithAdminPageHeader(request);
  }

  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const corsHeaders = getCorsHeaders(request);
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
  }

  if (!verifyMutationOrigin(request)) {
    return applyCors(csrfForbiddenResponse(), request);
  }

  let rateLimitResponse: NextResponse | null = null;
  let adminForwardHeaders: Headers | null = null;

  if (pathname.startsWith("/api/v1/admin/")) {
    const authRes = await requireAdminAuth(request);
    if (!authRes.ok) {
      return applyCors(authRes.response, request);
    }

    adminForwardHeaders = stripTrustedAdminHeaders(request.headers);
    setTrustedAdminHeaders(adminForwardHeaders, {
      userId: authRes.userId,
      roles: authRes.roles,
    });
  } else if (
    (pathname === "/api/v1/auth/login" || pathname === "/api/v1/auth/register") &&
    request.method === "POST"
  ) {
    rateLimitResponse = await checkRateLimitByIp(request, RATE_LIMIT_AUTH);
  } else if (isPasswordResetPath(pathname, request.method)) {
    rateLimitResponse = await checkRateLimitByIp(request, RATE_LIMIT_PASSWORD);
  } else if (pathname === "/api/v1/contact" && request.method === "POST") {
    rateLimitResponse = await checkRateLimitByIp(request, RATE_LIMIT_CONTACT);
  } else if (isGuestOrderLookup(request)) {
    rateLimitResponse = await checkRateLimitByIp(request, RATE_LIMIT_GUEST_ORDER);
    if (!rateLimitResponse) {
      const email = request.nextUrl.searchParams.get("email")?.trim();
      if (email) {
        rateLimitResponse = await checkRateLimitByIpAndSuffix(
          request,
          RATE_LIMIT_GUEST_ORDER_EMAIL,
          await hashGuestOrderEmailKey(email)
        );
      }
    }
  }

  if (rateLimitResponse) {
    return applyCors(rateLimitResponse, request);
  }

  const response = adminForwardHeaders
    ? NextResponse.next({ request: { headers: adminForwardHeaders } })
    : NextResponse.next();
  return applyCors(response, request);
}

export const config = {
  matcher: [
    "/supersudo",
    "/supersudo/:path*",
    "/api/v1/admin/:path*",
    "/api/v1/auth/login",
    "/api/v1/auth/register",
    "/api/v1/:path*",
    "/api/health",
  ],
};
