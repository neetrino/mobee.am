import { NextRequest, NextResponse } from "next/server";
import * as jose from "jose";
import { getAccessTokenFromRequest } from "@/lib/security/auth-cookie";
import { getCorsHeaders } from "@/lib/security/cors";
import { JWT_ALGORITHM } from "@/lib/security/jwt.constants";
import { resolveAdminGateFromJwtPayload } from "@/lib/security/jwt-payload";
import {
  checkRateLimitByIp,
  RATE_LIMIT_AUTH,
  RATE_LIMIT_CONTACT,
  RATE_LIMIT_GUEST_ORDER,
  RATE_LIMIT_PASSWORD,
} from "@/lib/security/rate-limit";

/** Protect /api/v1/admin/* — valid JWT + admin role when roles claim is present. */
async function requireAdminAuth(request: NextRequest): Promise<NextResponse | null> {
  const token = getAccessTokenFromRequest(request);

  if (!token) {
    return NextResponse.json(
      {
        type: "https://api.shop.am/problems/unauthorized",
        title: "Unauthorized",
        status: 401,
        detail: "Missing or invalid session",
      },
      { status: 401 }
    );
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return NextResponse.json(
      {
        type: "https://api.shop.am/problems/internal-error",
        title: "Internal Server Error",
        status: 500,
        detail: "Server configuration error",
      },
      { status: 500 }
    );
  }

  try {
    const key = new TextEncoder().encode(secret);
    const { payload } = await jose.jwtVerify(token, key, {
      algorithms: [JWT_ALGORITHM],
    });

    const gate = resolveAdminGateFromJwtPayload(payload);
    if (gate === "deny") {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/forbidden",
          title: "Forbidden",
          status: 403,
          detail: "Admin access required",
        },
        { status: 403 }
      );
    }

    return null;
  } catch {
    return NextResponse.json(
      {
        type: "https://api.shop.am/problems/unauthorized",
        title: "Unauthorized",
        status: 401,
        detail: "Invalid or expired token",
      },
      { status: 401 }
    );
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

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const corsHeaders = getCorsHeaders(request);
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
  }

  let rateLimitResponse: NextResponse | null = null;

  if (pathname.startsWith("/api/v1/admin/")) {
    const authRes = await requireAdminAuth(request);
    if (authRes) {
      return applyCors(authRes, request);
    }
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
  }

  if (rateLimitResponse) {
    return applyCors(rateLimitResponse, request);
  }

  const response = NextResponse.next();
  return applyCors(response, request);
}

export const config = {
  matcher: [
    "/api/v1/admin/:path*",
    "/api/v1/auth/login",
    "/api/v1/auth/register",
    "/api/v1/:path*",
    "/api/health",
  ],
};
