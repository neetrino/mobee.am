import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  error: vi.fn(),
}));

vi.mock("@/lib/utils/logger", () => ({
  logger: {
    error: mocks.error,
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

import {
  CHECKOUT_PUBLIC_INTERNAL_DETAIL,
  throwMappedCheckoutFailure,
} from "./map-checkout-unexpected-error";

const LEAK = "Can't reach database server at postgresql://app:super-token@db/host";

afterEach(() => {
  vi.unstubAllEnvs();
  mocks.error.mockReset();
});

describe("throwMappedCheckoutFailure", () => {
  it("rethrown domain errors without logging", () => {
    const domain = {
      status: 422,
      type: "https://api.shop.am/problems/validation-error",
      title: "Insufficient stock",
    };
    let thrown: unknown;
    try {
      throwMappedCheckoutFailure(domain, "req-1");
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBe(domain);
    expect(mocks.error).not.toHaveBeenCalled();
  });

  it("logs only safe fields in production and uses a public 500 detail", () => {
    vi.stubEnv("NODE_ENV", "production");
    const error = Object.assign(new Error(LEAK), {
      name: "PrismaClientKnownRequestError",
      code: "P2010",
      meta: { sql: "SELECT 1" },
      stack: `Error: ${LEAK}\n    at checkout`,
    });

    try {
      throwMappedCheckoutFailure(error, "req-prod-1");
    } catch (mapped: unknown) {
      expect(mapped).toMatchObject({
        status: 500,
        title: "Internal Server Error",
        detail: CHECKOUT_PUBLIC_INTERNAL_DETAIL,
      });
      expect(JSON.stringify(mapped)).not.toContain("postgresql://");
      expect(JSON.stringify(mapped)).not.toContain("super-token");
      expect(JSON.stringify(mapped)).not.toContain("Prisma");
    }

    expect(mocks.error).toHaveBeenCalledWith(
      "Checkout failed",
      expect.objectContaining({
        requestId: "req-prod-1",
        errorName: "PrismaClientKnownRequestError",
        errorCode: "P2010",
        operation: "checkout",
      }),
    );
    const logged = JSON.stringify(mocks.error.mock.calls[0]?.[1]);
    expect(logged).not.toContain("postgresql://");
    expect(logged).not.toContain("super-token");
    expect(logged).not.toContain(LEAK);
    expect(logged).not.toContain("SELECT 1");
    expect(logged).not.toContain("at checkout");
  });

  it("maps P2002 to 409 without internals", () => {
    vi.stubEnv("NODE_ENV", "production");
    const error = Object.assign(new Error(`Unique constraint ${LEAK}`), {
      name: "PrismaClientKnownRequestError",
      code: "P2002",
      meta: { target: ["number"] },
    });

    expect(() => throwMappedCheckoutFailure(error, "req-2")).toThrow(
      expect.objectContaining({
        status: 409,
        title: "Conflict",
        detail: "Order number already exists, please try again",
      }),
    );
    const logged = JSON.stringify(mocks.error.mock.calls[0]?.[1]);
    expect(logged).toContain("P2002");
    expect(logged).not.toContain("postgresql://");
  });
});
