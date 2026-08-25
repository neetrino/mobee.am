import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertProductionCoreEnv,
  getEmailConfig,
  getEnv,
  getMissingCoreEnvNames,
  getR2Config,
  requireEmailConfig,
  requireJwtSecret,
  resetEnvCache,
} from "@/config/env";
import { MissingEnvError } from "@/config/env-core";

const ORIGINAL_ENV = { ...process.env };

function restoreEnv(): void {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) {
      delete process.env[key];
    }
  }
  Object.assign(process.env, ORIGINAL_ENV);
  resetEnvCache();
}

describe("typed env contract", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    restoreEnv();
  });

  it("does not require production secrets in test/build", () => {
    delete process.env.JWT_SECRET;
    delete process.env.DATABASE_URL;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    vi.stubEnv("NODE_ENV", "test");
    const env = getEnv();
    expect(env.JWT_SECRET).toBeUndefined();
    expect(env.DATABASE_URL).toBeUndefined();
  });

  it("reports missing core names without secret values", () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.JWT_SECRET = "super-secret-value-that-must-not-leak-123456";
    process.env.JWT_SECRET = "short";
    delete process.env.DATABASE_URL;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.APP_URL;
    delete process.env.CORS_ORIGIN;
    delete process.env.NEXT_PUBLIC_APP_URL;
    const missing = getMissingCoreEnvNames(getEnv());
    const serialized = JSON.stringify(missing);
    expect(missing).toContain("DATABASE_URL");
    expect(missing).toContain("JWT_SECRET");
    expect(serialized).not.toContain("super-secret-value");
    expect(serialized).not.toContain("short");
  });

  it("allows optional integrations to be absent", () => {
    delete process.env.R2_ACCOUNT_ID;
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.R2_SECRET_ACCESS_KEY;
    delete process.env.R2_BUCKET_NAME;
    delete process.env.R2_PUBLIC_URL;
    expect(getR2Config()).toBeNull();
    expect(getEnv().R2_ACCOUNT_ID).toBeUndefined();
  });

  it("requires email secrets only when the feature is used", () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
    delete process.env.EMAIL_FROM;
    expect(getEmailConfig()).toBeNull();
    expect(() => requireEmailConfig()).toThrow();
    try {
      requireEmailConfig();
    } catch (error) {
      expect(JSON.stringify(error)).not.toContain("re_");
    }
  });

  it("fails fast in production runtime when core env is missing", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PHASE", "");
    delete process.env.DATABASE_URL;
    delete process.env.JWT_SECRET;
    expect(() => assertProductionCoreEnv()).toThrow(MissingEnvError);
    try {
      assertProductionCoreEnv();
    } catch (error) {
      expect(error).toBeInstanceOf(MissingEnvError);
      expect(JSON.stringify(error)).not.toContain("postgres://");
    }
  });

  it("does not fail during production build when core env is missing", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PHASE", "phase-production-build");
    delete process.env.DATABASE_URL;
    expect(() => assertProductionCoreEnv()).not.toThrow();
  });

  it("does not include secret values when JWT is missing", () => {
    delete process.env.JWT_SECRET;
    try {
      requireJwtSecret();
      throw new Error("expected throw");
    } catch (error) {
      expect(JSON.stringify(error)).not.toMatch(/secret|postgres:\/\//i);
    }
  });
});
