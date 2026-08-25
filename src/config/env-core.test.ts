import { afterEach, describe, expect, it, vi } from "vitest";
import { collectMissingEdgeSecurityEnvNames, isEdgeSecurityEnvValid } from "./env-core";

describe("edge security env", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is valid outside production even without secrets", () => {
    vi.stubEnv("NODE_ENV", "test");
    expect(isEdgeSecurityEnvValid()).toBe(true);
  });

  it("requires JWT length 32 and an origin in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("JWT_SECRET", "short");
    vi.stubEnv("APP_URL", "");
    vi.stubEnv("CORS_ORIGIN", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    const missing = collectMissingEdgeSecurityEnvNames();
    expect(missing).toContain("JWT_SECRET");
    expect(missing).toContain("APP_URL");
    expect(JSON.stringify(missing)).not.toContain("short");
    expect(isEdgeSecurityEnvValid()).toBe(false);
  });
});
