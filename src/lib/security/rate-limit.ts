import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { ERROR_CODES, problemType, PUBLIC_DETAILS, titleForStatus } from "@/lib/errors/error-codes";
import { problemResponse } from "@/lib/errors/problem-response";
import { requestInstance, resolveRequestId } from "@/lib/errors/request-id";

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

type RateLimitWindow = `${number} s` | `${number} m`;

interface RateLimitConfig {
  prefix: string;
  requests: number;
  window: RateLimitWindow;
}

const limiterCache = new Map<string, Ratelimit>();

function isRateLimitConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  );
}

function getLimiter(config: RateLimitConfig): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return null;
  }

  const cacheKey = `${config.prefix}:${config.requests}:${config.window}`;
  const cached = limiterCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const redis = new Redis({ url, token });
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.requests, config.window),
    prefix: config.prefix,
  });
  limiterCache.set(cacheKey, limiter);
  return limiter;
}

function securityUnavailableResponse(request: NextRequest, requestId: string): NextResponse {
  return problemResponse(
    {
      type: problemType(ERROR_CODES.SERVICE_UNAVAILABLE),
      title: titleForStatus(503),
      status: 503,
      detail: PUBLIC_DETAILS.UNAVAILABLE,
      code: ERROR_CODES.SERVICE_UNAVAILABLE,
    },
    requestInstance(request),
    requestId,
  );
}

function tooManyRequestsResponse(request: NextRequest, requestId: string): NextResponse {
  return problemResponse(
    {
      type: problemType(ERROR_CODES.RATE_LIMITED),
      title: titleForStatus(429),
      status: 429,
      detail: PUBLIC_DETAILS.RATE_LIMITED,
      code: ERROR_CODES.RATE_LIMITED,
    },
    requestInstance(request),
    requestId,
  );
}

/**
 * Returns 429 when limit exceeded; 503 in production when Redis is missing or fails;
 * `null` when allowed or rate limiting is skipped in development.
 */
export async function checkRateLimitByKey(
  request: NextRequest,
  config: RateLimitConfig,
  key: string,
  requestId = resolveRequestId(request),
): Promise<NextResponse | null> {
  const limiter = getLimiter(config);
  if (!limiter) {
    if (process.env.NODE_ENV === "production") {
      return securityUnavailableResponse(request, requestId);
    }
    return null;
  }

  try {
    const { success } = await limiter.limit(key);
    return success ? null : tooManyRequestsResponse(request, requestId);
  } catch {
    return securityUnavailableResponse(request, requestId);
  }
}

/** IP-scoped rate limit (auth, contact, etc.). */
export async function checkRateLimitByIp(
  request: NextRequest,
  config: RateLimitConfig,
  requestId = resolveRequestId(request),
): Promise<NextResponse | null> {
  const ip = getClientIp(request);
  return checkRateLimitByKey(request, config, ip, requestId);
}

/** IP + extra suffix (e.g. hashed email for guest order lookup). */
export async function checkRateLimitByIpAndSuffix(
  request: NextRequest,
  config: RateLimitConfig,
  suffix: string,
  requestId = resolveRequestId(request),
): Promise<NextResponse | null> {
  const ip = getClientIp(request);
  return checkRateLimitByKey(request, config, `${ip}:${suffix}`, requestId);
}

export { isRateLimitConfigured };

export const RATE_LIMIT_AUTH: RateLimitConfig = {
  prefix: "ratelimit:auth",
  requests: 10,
  window: "60 s",
};

export const RATE_LIMIT_PASSWORD: RateLimitConfig = {
  prefix: "ratelimit:password",
  requests: 5,
  window: "60 s",
};

export const RATE_LIMIT_CONTACT: RateLimitConfig = {
  prefix: "ratelimit:contact",
  requests: 5,
  window: "60 s",
};

export const RATE_LIMIT_GUEST_ORDER: RateLimitConfig = {
  prefix: "ratelimit:guest-order",
  requests: 30,
  window: "60 s",
};

export const RATE_LIMIT_GUEST_ORDER_EMAIL: RateLimitConfig = {
  prefix: "ratelimit:guest-order-email",
  requests: 10,
  window: "60 s",
};
