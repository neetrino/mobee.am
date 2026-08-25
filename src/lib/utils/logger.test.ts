import { afterEach, describe, expect, it, vi } from "vitest";
import { logger } from "./logger";

describe("logger redaction", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("redacts secrets and connection strings in production JSON", () => {
    vi.stubEnv("NODE_ENV", "production");
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    logger.error("login failed", {
      password: "hunter2",
      token: "abc",
      DATABASE_URL: "postgres://user:pass@host/db",
      errorMessage: "Can't reach postgres://user:pass@host/db",
      requestId: "req-1",
    });
    const line = String(spy.mock.calls[0]?.[0]);
    expect(line.startsWith("{")).toBe(true);
    expect(line).toContain("req-1");
    expect(line).not.toContain("hunter2");
    expect(line).not.toContain("postgres://user:pass");
  });

  it("redacts nested provider payloads, bearer tokens, and stacks", () => {
    vi.stubEnv("NODE_ENV", "development");
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    logger.error("provider failed", {
      nested: {
        providerResponse: { signature: "pay_sig_live" },
        authorization: "Bearer super-secret-token",
      },
      stack: "Error at https://user:pass@host/path",
      errorMessage: "password=hunter2&token=abc",
    });
    const line = String(spy.mock.calls[0]?.[0]);
    expect(line).not.toContain("pay_sig_live");
    expect(line).not.toContain("super-secret-token");
    expect(line).not.toContain("user:pass");
    expect(line).not.toContain("hunter2");
  });
});
