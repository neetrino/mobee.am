import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  error: vi.fn(),
  info: vi.fn(),
}));

vi.mock("@/lib/utils/logger", () => ({
  logger: {
    error: mocks.error,
    info: mocks.info,
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { throwMappedCheckoutFailure } from "./map-checkout-unexpected-error";

describe("checkout production logging", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    mocks.error.mockReset();
  });

  it("never logs raw idempotency keys in production checkout failures", () => {
    vi.stubEnv("NODE_ENV", "production");
    const rawKey = "client-idempotency-key-12345678";
    const error = Object.assign(new Error(`duplicate key value ${rawKey}`), {
      name: "PrismaClientKnownRequestError",
      code: "P2002",
      meta: { target: ["idempotencyScopeHash", "idempotencyKeyHash"] },
    });

    expect(() => throwMappedCheckoutFailure(error, "req-log-1")).toThrow(
      expect.objectContaining({ status: 409 }),
    );

    const logged = JSON.stringify(mocks.error.mock.calls[0]?.[1]);
    expect(logged).not.toContain(rawKey);
    expect(logged).not.toContain("client-idempotency");
  });
});
