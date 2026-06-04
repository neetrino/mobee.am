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

/**
 * Returns 429 response when limit exceeded; `null` when allowed or Redis is not configured.
 */
export async function checkRateLimitByIp(
  request: NextRequest,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const limiter = getLimiter(config);
  if (!limiter) {
    return null;
  }

  const ip = getClientIp(request);
  const { success } = await limiter.limit(ip);
  if (success) {
    return null;
  }

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
