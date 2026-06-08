import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

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

function rateLimitUnavailableResponse(): NextResponse {
  return NextResponse.json(
    {
      type: "https://api.shop.am/problems/service-unavailable",
      title: "Service Unavailable",
      status: 503,
      detail: "Rate limiting is not configured. Contact support.",
    },
    { status: 503 }
  );
}

function tooManyRequestsResponse(): NextResponse {
  return NextResponse.json(
    {
      type: "https://api.shop.am/problems/too-many-requests",
      title: "Too Many Requests",
      status: 429,
      detail: "Too many requests. Try again later.",
    },
    { status: 429 }
  );
}

/**
 * Returns 429 when limit exceeded; 503 in production when Redis is missing;
 * `null` when allowed or rate limiting is skipped in development.
 */
export async function checkRateLimitByKey(
  request: NextRequest,
  config: RateLimitConfig,
  key: string
): Promise<NextResponse | null> {
  const limiter = getLimiter(config);
  if (!limiter) {
    if (process.env.NODE_ENV === "production") {
      return rateLimitUnavailableResponse();
    }
    return null;
  }

  const { success } = await limiter.limit(key);
  return success ? null : tooManyRequestsResponse();
}

/** IP-scoped rate limit (auth, contact, etc.). */
export async function checkRateLimitByIp(
  request: NextRequest,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const ip = getClientIp(request);
  return checkRateLimitByKey(request, config, ip);
}

/** IP + extra suffix (e.g. hashed email for guest order lookup). */
export async function checkRateLimitByIpAndSuffix(
  request: NextRequest,
  config: RateLimitConfig,
  suffix: string
): Promise<NextResponse | null> {
  const ip = getClientIp(request);
  return checkRateLimitByKey(request, config, `${ip}:${suffix}`);
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

/** Stricter per-email cap against guest order enumeration. */
export const RATE_LIMIT_GUEST_ORDER_EMAIL: RateLimitConfig = {
  prefix: "ratelimit:guest-order-email",
  requests: 10,
  window: "60 s",
};
