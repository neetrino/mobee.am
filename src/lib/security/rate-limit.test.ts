import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    static slidingWindow(requests: number, window: string) {
      return { type: "sliding", requests, window };
    }

    async limit(_key: string): Promise<{ success: boolean }> {
      throw new Error("redis timeout");
    }
  },
}));

import { checkRateLimitByIp, RATE_LIMIT_AUTH } from "./rate-limit";

describe("security rate limit fail-closed", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects the request in production when Redis is not configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    const req = new NextRequest("http://localhost:3000/api/v1/auth/login", { method: "POST" });
    const res = await checkRateLimitByIp(req, RATE_LIMIT_AUTH);
    expect(res?.status).toBe(503);
    const body = await res?.json();
    expect(body.code).toBe("SERVICE_UNAVAILABLE");
    expect(JSON.stringify(body)).not.toContain("UPSTASH");
  });

  it("returns 503 when the limiter throws", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
    const req = new NextRequest("http://localhost:3000/api/v1/auth/login", { method: "POST" });
    const res = await checkRateLimitByIp(req, RATE_LIMIT_AUTH);
    expect(res?.status).toBe(503);
    const body = await res?.json();
    expect(JSON.stringify(body)).not.toContain("redis timeout");
  });
});
