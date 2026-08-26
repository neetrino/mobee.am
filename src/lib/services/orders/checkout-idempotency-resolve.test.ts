import { afterEach, describe, expect, it, vi } from "vitest";
import { CHECKOUT_IDEMPOTENCY_CONFLICT, assertIdempotencyFingerprintMatch } from "./checkout-idempotency";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  orderFindFirst: vi.fn(),
  executeRaw: vi.fn(),
}));

vi.mock("@white-shop/db", () => ({
  Prisma: { sql: (strings: TemplateStringsArray) => strings.join("") },
  db: {
    $transaction: mocks.transaction,
  },
}));

import {
  resolveIdempotencyAfterUniqueConflict,
  tryReplayExistingCheckout,
} from "./checkout-idempotency-resolve";

describe("checkout idempotency resolve", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("replays an existing order when scope+key+fingerprint match", async () => {
    const tx = {
      order: { findFirst: mocks.orderFindFirst },
      $executeRaw: mocks.executeRaw,
    };
    mocks.orderFindFirst.mockResolvedValue({
      id: "order-1",
      number: "1001",
      requestFingerprint: "fp-1",
      payments: [{ id: "pay-1", provider: "cash_on_delivery" }],
    });

    const replay = await tryReplayExistingCheckout({
      tx: tx as never,
      scopeHash: "scope",
      keyHash: "key",
      requestFingerprint: "fp-1",
    });

    expect(replay).toEqual({
      replay: true,
      order: expect.objectContaining({ id: "order-1" }),
      payment: expect.objectContaining({ id: "pay-1" }),
    });
  });

  it("throws 409 when the same key has a different fingerprint", async () => {
    mocks.orderFindFirst.mockResolvedValue({
      id: "order-1",
      requestFingerprint: "fp-old",
      payments: [{ id: "pay-1" }],
    });

    await expect(
      tryReplayExistingCheckout({
        tx: { order: { findFirst: mocks.orderFindFirst } } as never,
        scopeHash: "scope",
        keyHash: "key",
        requestFingerprint: "fp-new",
      }),
    ).rejects.toEqual(CHECKOUT_IDEMPOTENCY_CONFLICT);
  });

  it("recovers from scope+key unique conflicts by replaying the winner", async () => {
    mocks.executeRaw.mockResolvedValue(undefined);
    mocks.orderFindFirst.mockResolvedValue({
      id: "order-2",
      number: "1002",
      requestFingerprint: "fp-1",
      payments: [{ id: "pay-2", provider: "cash_on_delivery" }],
    });

    const replay = await resolveIdempotencyAfterUniqueConflict({
      tx: {
        order: { findFirst: mocks.orderFindFirst },
        $executeRaw: mocks.executeRaw,
      } as never,
      scopeHash: "scope",
      keyHash: "key",
      requestFingerprint: "fp-1",
    });

    expect(replay.replay).toBe(true);
    expect(replay.order.number).toBe("1002");
    expect(mocks.executeRaw).toHaveBeenCalled();
  });
});

describe("assertIdempotencyFingerprintMatch", () => {
  it("accepts matching fingerprints", () => {
    expect(() => assertIdempotencyFingerprintMatch("fp", "fp")).not.toThrow();
  });
});
