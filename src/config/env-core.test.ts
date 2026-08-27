import { afterEach, describe, expect, it, vi } from "vitest";
import {
  collectMissingCoreEnvNames,
  collectMissingEdgeSecurityEnvNames,
  isEdgeSecurityEnvValid,
} from "./env-core";

describe("edge security env", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is valid outside production even without secrets", () => {
    vi.stubEnv("NODE_ENV", "test");
    expect(isEdgeSecurityEnvValid()).toBe(true);
  });

  it("requires JWT length 32 and Redis in production, not origin", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("JWT_SECRET", "short");
    vi.stubEnv("APP_URL", "");
    vi.stubEnv("CORS_ORIGIN", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    const missing = collectMissingEdgeSecurityEnvNames();
    expect(missing).toContain("JWT_SECRET");
    expect(missing).not.toContain("APP_URL");
    expect(JSON.stringify(missing)).not.toContain("short");
    expect(isEdgeSecurityEnvValid()).toBe(false);
  });

  it("is valid in production without APP_URL when JWT and Redis are set", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("JWT_SECRET", "a".repeat(32));
    vi.stubEnv("APP_URL", "");
    vi.stubEnv("CORS_ORIGIN", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
    expect(collectMissingEdgeSecurityEnvNames()).toEqual([]);
    expect(isEdgeSecurityEnvValid()).toBe(true);
  });

  it("does not treat missing origin as a core runtime failure", () => {
    expect(
      collectMissingCoreEnvNames({
        DATABASE_URL: "postgres://example",
        JWT_SECRET: "a".repeat(32),
        UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
        UPSTASH_REDIS_REST_TOKEN: "token",
      }),
    ).toEqual([]);
  });
});
