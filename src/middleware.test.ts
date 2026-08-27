import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../middleware";
import { REQUEST_ID_HEADER } from "@/lib/errors/request-id";
import { runApiRoute } from "@/lib/errors/run-api-route";
import { NextResponse } from "next/server";

function apiRequest(
  path: string,
  init?: { method?: string; headers?: Record<string, string> },
): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, {
    method: init?.method ?? "GET",
    headers: init?.headers,
  });
}

async function headerAndBodyId(response: Response): Promise<{ headerId: string | null; bodyId: string | undefined }> {
  const headerId = response.headers.get(REQUEST_ID_HEADER);
  let bodyId: string | undefined;
  try {
    const body = (await response.clone().json()) as { requestId?: string };
    bodyId = body.requestId;
  } catch {
    bodyId = undefined;
  }
  return { headerId, bodyId };
}

describe("middleware request ID", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses one ID for CSRF 403 without an incoming id", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("JWT_SECRET", "a".repeat(32));
    vi.stubEnv("APP_URL", "http://localhost:3000");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
    const response = await middleware(
      apiRequest("/api/v1/contact", {
        method: "POST",
        headers: { Origin: "https://attacker.example" },
      }),
    );
    expect(response.status).toBe(403);
    const { headerId, bodyId } = await headerAndBodyId(response);
    expect(headerId).toBeTruthy();
    expect(headerId).toBe(bodyId);
  });

  it("does not 503 catalog reads when origin env is unset", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("JWT_SECRET", "a".repeat(32));
    vi.stubEnv("APP_URL", "");
    vi.stubEnv("CORS_ORIGIN", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
    const response = await middleware(apiRequest("/api/v1/products"));
    expect(response.status).not.toBe(503);
  });

  it("uses one ID for Redis-unavailable 503", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("JWT_SECRET", "a".repeat(32));
    vi.stubEnv("APP_URL", "http://localhost:3000");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    const response = await middleware(apiRequest("/api/v1/auth/login", { method: "POST" }));
    expect(response.status).toBe(503);
    const { headerId, bodyId } = await headerAndBodyId(response);
    expect(headerId).toBeTruthy();
    expect(headerId).toBe(bodyId);
    const text = await response.text();
    expect(text).not.toContain("UPSTASH");
  });

  it("uses one ID for admin 401", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("JWT_SECRET", "a".repeat(32));
    vi.stubEnv("APP_URL", "http://localhost:3000");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
    const response = await middleware(apiRequest("/api/v1/admin/products"));
    expect(response.status).toBe(401);
    const { headerId, bodyId } = await headerAndBodyId(response);
    expect(headerId).toBe(bodyId);
  });

  it("replaces an unsafe incoming ID with one UUID", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const response = await middleware(
      apiRequest("/api/v1/products", {
        headers: { "x-request-id": "bad id with spaces" },
      }),
    );
    const { headerId } = await headerAndBodyId(response);
    expect(headerId).not.toBe("bad id with spaces");
    expect(headerId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it("echoes a safe incoming ID", async () => {
    const response = await middleware(
      apiRequest("/api/v1/products", {
        headers: { "x-request-id": "req-safe-12345" },
      }),
    );
    expect(response.headers.get(REQUEST_ID_HEADER)).toBe("req-safe-12345");
  });

  it("shares the same ID between middleware and runApiRoute", async () => {
    const incoming = "req-shared-999";
    const mw = await middleware(
      apiRequest("/api/v1/products", { headers: { "x-request-id": incoming } }),
    );
    expect(mw.headers.get(REQUEST_ID_HEADER)).toBe(incoming);

    const routed = await runApiRoute(
      apiRequest("/api/v1/products", { headers: { "x-request-id": incoming } }),
      async () => NextResponse.json({ ok: true }),
    );
    expect(routed.headers.get(REQUEST_ID_HEADER)).toBe(incoming);
  });
});
