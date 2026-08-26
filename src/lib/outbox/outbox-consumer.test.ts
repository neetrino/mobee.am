import { afterEach, describe, expect, it, vi } from "vitest";
import { computeOutboxBackoffMs, computeOutboxRetryAvailableAt } from "./outbox-backoff";
import { OUTBOX_BACKOFF_BASE_MS, OUTBOX_BACKOFF_CAP_MS, OUTBOX_MAX_ATTEMPTS } from "./outbox.constants";
import { redactOutboxError } from "./redact-outbox-error";

describe("outbox backoff", () => {
  it("uses 30s exponential backoff capped at one hour", () => {
    expect(computeOutboxBackoffMs(1)).toBe(OUTBOX_BACKOFF_BASE_MS);
    expect(computeOutboxBackoffMs(2)).toBe(OUTBOX_BACKOFF_BASE_MS * 2);
    expect(computeOutboxBackoffMs(OUTBOX_MAX_ATTEMPTS)).toBe(OUTBOX_BACKOFF_CAP_MS);
  });

  it("schedules retry availableAt from attempt count", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const retryAt = computeOutboxRetryAvailableAt(2, now);
    expect(retryAt.getTime() - now.getTime()).toBe(OUTBOX_BACKOFF_BASE_MS * 2);
  });
});

describe("redactOutboxError", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("redacts bearer tokens in non-production", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(redactOutboxError(new Error("Resend failed Bearer secret-token-value"))).not.toContain(
      "secret-token-value",
    );
  });

  it("stores only the error name in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(redactOutboxError(new Error("postgresql://user:pass@host/db"))).toBe("Error");
  });
});
