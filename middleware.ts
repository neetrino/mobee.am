import { NextRequest, NextResponse } from "next/server";
import * as jose from "jose";
import { getAccessTokenFromRequest } from "@/lib/security/auth-cookie";
import { getCorsHeaders } from "@/lib/security/cors";
import { verifyMutationOrigin } from "@/lib/security/csrf-origin";
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
import { ERROR_CODES, problemType, PUBLIC_DETAILS, titleForStatus } from "@/lib/errors/error-codes";
import { problemResponse } from "@/lib/errors/problem-response";
import { REQUEST_ID_HEADER, requestInstance, resolveRequestId } from "@/lib/errors/request-id";
import {
  getEdgeJwtSecret,
  isEdgeSecurityEnvValid,
  isJwtSecretLengthValid,
} from "@/config/env-core";
import { handleStorefrontLocale } from "@/lib/i18n/middleware-locale";

type AdminAuthResult =
  | { ok: true; userId: string; roles: string[] }
  | { ok: false; response: NextResponse };

function edgeProblem(
  request: NextRequest,
  status: number,
  code: (typeof ERROR_CODES)[keyof typeof ERROR_CODES],
  detail: string,
  requestId: string,
): NextResponse {
  return problemResponse(
    {
      type: problemType(code),
      title: titleForStatus(status),
      status,
      detail,
      code,
    },
    requestInstance(request),
    requestId,
  );
}

function applyCors(
  response: NextResponse,
  request: NextRequest,
  requestId: string,
): NextResponse {
  response.headers.set(REQUEST_ID_HEADER, requestId);
  const corsHeaders = getCorsHeaders(request);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

/** Protect /api/v1/admin/* — valid JWT + admin role in token claims. */
async function requireAdminAuth(
  request: NextRequest,
  requestId: string,
): Promise<AdminAuthResult> {
  const cleanedHeaders = stripTrustedAdminHeaders(request.headers);
  const token = getAccessTokenFromRequest(
    new NextRequest(request.url, { headers: cleanedHeaders, method: request.method }),
  );

  if (!token) {
    return {
      ok: false,
      response: edgeProblem(
        request,
        401,
        ERROR_CODES.UNAUTHORIZED,
        "Missing or invalid session",
        requestId,
      ),
    };
  }

  const secret = getEdgeJwtSecret();
  if (!secret || (process.env.NODE_ENV === "production" && !isJwtSecretLengthValid(secret))) {
    return {
      ok: false,
      response: edgeProblem(
        request,
        process.env.NODE_ENV === "production" ? 503 : 500,
        process.env.NODE_ENV === "production"
          ? ERROR_CODES.SERVICE_UNAVAILABLE
          : ERROR_CODES.INTERNAL_ERROR,
        process.env.NODE_ENV === "production"
          ? PUBLIC_DETAILS.UNAVAILABLE
          : "Server configuration error",
        requestId,
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
        response: edgeProblem(
          request,
          403,
          ERROR_CODES.FORBIDDEN,
          "Admin access required",
          requestId,
        ),
      };
    }

    const userId = (payload as AccessTokenPayload).userId?.trim();
    const roles = (payload as AccessTokenPayload).roles;
    if (!userId || !Array.isArray(roles) || roles.length === 0) {
      return {
        ok: false,
        response: edgeProblem(
          request,
          401,
          ERROR_CODES.UNAUTHORIZED,
          "Invalid or expired token",
          requestId,
        ),
      };
    }

    return { ok: true, userId, roles };
  } catch {
    return {
      ok: false,
      response: edgeProblem(
        request,
        401,
        ERROR_CODES.UNAUTHORIZED,
        "Invalid or expired token",
        requestId,
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

function csrfForbiddenResponse(request: NextRequest, requestId: string): NextResponse {
  return edgeProblem(
    request,
    403,
    ERROR_CODES.FORBIDDEN,
    "Cross-site request blocked",
    requestId,
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

function withRequestIdHeaders(base: Headers, requestId: string): Headers {
  const headers = new Headers(base);
  headers.set(REQUEST_ID_HEADER, requestId);
  return headers;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const localeResponse = handleStorefrontLocale(request);
  if (localeResponse) {
    return localeResponse;
  }

  if (isAdminPageRoute(pathname)) {
    return forwardWithAdminPageHeader(request);
  }

  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const requestId = resolveRequestId(request);
  const requestHeaders = withRequestIdHeaders(request.headers, requestId);
  const requestWithId = new NextRequest(request.url, {
    method: request.method,
    headers: requestHeaders,
  });

  if (process.env.NODE_ENV === "production" && !isEdgeSecurityEnvValid()) {
    return applyCors(
      edgeProblem(
        requestWithId,
        503,
        ERROR_CODES.SERVICE_UNAVAILABLE,
        PUBLIC_DETAILS.UNAVAILABLE,
        requestId,
      ),
      requestWithId,
      requestId,
    );
  }

  const corsHeaders = getCorsHeaders(requestWithId);
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        ...corsHeaders,
        [REQUEST_ID_HEADER]: requestId,
      },
    });
  }

  if (!verifyMutationOrigin(requestWithId)) {
    return applyCors(csrfForbiddenResponse(requestWithId, requestId), requestWithId, requestId);
  }

  let rateLimitResponse: NextResponse | null = null;
  let adminForwardHeaders: Headers | null = null;

  if (pathname.startsWith("/api/v1/admin/")) {
    const authRes = await requireAdminAuth(requestWithId, requestId);
    if (!authRes.ok) {
      return applyCors(authRes.response, requestWithId, requestId);
    }

    adminForwardHeaders = stripTrustedAdminHeaders(requestWithId.headers);
    setTrustedAdminHeaders(adminForwardHeaders, {
      userId: authRes.userId,
      roles: authRes.roles,
    });
    adminForwardHeaders.set(REQUEST_ID_HEADER, requestId);
  } else if (
    (pathname === "/api/v1/auth/login" || pathname === "/api/v1/auth/register") &&
    request.method === "POST"
  ) {
    rateLimitResponse = await checkRateLimitByIp(requestWithId, RATE_LIMIT_AUTH, requestId);
  } else if (isPasswordResetPath(pathname, request.method)) {
    rateLimitResponse = await checkRateLimitByIp(requestWithId, RATE_LIMIT_PASSWORD, requestId);
  } else if (pathname === "/api/v1/contact" && request.method === "POST") {
    rateLimitResponse = await checkRateLimitByIp(requestWithId, RATE_LIMIT_CONTACT, requestId);
  } else if (isGuestOrderLookup(requestWithId)) {
    rateLimitResponse = await checkRateLimitByIp(requestWithId, RATE_LIMIT_GUEST_ORDER, requestId);
    if (!rateLimitResponse) {
      const email = requestWithId.nextUrl.searchParams.get("email")?.trim();
      if (email) {
        rateLimitResponse = await checkRateLimitByIpAndSuffix(
          requestWithId,
          RATE_LIMIT_GUEST_ORDER_EMAIL,
          await hashGuestOrderEmailKey(email),
          requestId,
        );
      }
    }
  }

  if (rateLimitResponse) {
    return applyCors(rateLimitResponse, requestWithId, requestId);
  }

  const response = adminForwardHeaders
    ? NextResponse.next({ request: { headers: adminForwardHeaders } })
    : NextResponse.next({ request: { headers: requestHeaders } });
  return applyCors(response, requestWithId, requestId);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
