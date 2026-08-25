import { describe, expect, it, vi, beforeEach } from "vitest";
import { AppError } from "@/lib/errors/app-error";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  findUnique: vi.fn(),
  lockOrderForUpdate: vi.fn(),
  findPaymentByIdForOrder: vi.fn(),
  findLatestPayment: vi.fn(),
  applyPlannedTransitions: vi.fn(),
}));

vi.mock("@white-shop/db", () => ({
  Prisma: {},
  db: {
    $transaction: mocks.transaction,
    payment: { findUnique: mocks.findUnique },
  },
}));

vi.mock("./lock-order", () => ({
  lockOrderForUpdate: mocks.lockOrderForUpdate,
}));

vi.mock("./payment-row", () => ({
  findPaymentByIdForOrder: mocks.findPaymentByIdForOrder,
  findLatestPayment: mocks.findLatestPayment,
}));

vi.mock("./apply-order-transitions", () => ({
  applyPlannedTransitions: mocks.applyPlannedTransitions,
}));

import { applyPaymentCallback } from "./apply-payment-callback";

const context = {
  requestId: "req-1",
  actorUserId: null,
  source: "payment_provider" as const,
};

describe("applyPaymentCallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (fn: (tx: { payment: { findUnique: typeof mocks.findUnique } }) => unknown) => {
      return fn({ payment: { findUnique: mocks.findUnique } });
    });
  });

  it("returns 409 without writes for a stale payment attempt", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "pay-old",
      orderId: "order-1",
      order: { id: "order-1", number: "1001" },
    });
    mocks.lockOrderForUpdate.mockResolvedValue({
      id: "order-1",
      number: "1001",
      status: "pending",
      paymentStatus: "pending",
      fulfillmentStatus: "unfulfilled",
      paidAt: null,
      fulfilledAt: null,
      cancelledAt: null,
    });
    mocks.findPaymentByIdForOrder.mockResolvedValue({
      id: "pay-old",
      status: "pending",
      createdAt: new Date("2026-01-01"),
    });
    mocks.findLatestPayment.mockResolvedValue({
      id: "pay-new",
      status: "pending",
      createdAt: new Date("2026-01-02"),
    });

    await expect(
      applyPaymentCallback(
        { paymentId: "pay-old", orderNumber: "1001", status: "paid", provider: "idram" },
        context,
      ),
    ).rejects.toBeInstanceOf(AppError);
    expect(mocks.applyPlannedTransitions).not.toHaveBeenCalled();
  });

  it("applies the payment-row FSM without requesting an Order.status change", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "pay-1",
      orderId: "order-1",
      order: { id: "order-1", number: "1001" },
    });
    mocks.lockOrderForUpdate.mockResolvedValue({
      id: "order-1",
      number: "1001",
      status: "pending",
      paymentStatus: "pending",
      fulfillmentStatus: "unfulfilled",
      paidAt: null,
      fulfilledAt: null,
      cancelledAt: null,
    });
    mocks.findPaymentByIdForOrder.mockResolvedValue({
      id: "pay-1",
      status: "pending",
      createdAt: new Date("2026-01-01"),
    });
    mocks.findLatestPayment.mockResolvedValue({
      id: "pay-1",
      status: "pending",
      createdAt: new Date("2026-01-01"),
    });
    mocks.applyPlannedTransitions.mockResolvedValue(undefined);

    await expect(
      applyPaymentCallback(
        { paymentId: "pay-1", orderNumber: "1001", status: "paid", provider: "idram" },
        context,
      ),
    ).resolves.toBe("applied");

    expect(mocks.applyPlannedTransitions).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentId: "pay-1",
        paymentRowChange: expect.objectContaining({ kind: "apply", to: "paid" }),
        planned: expect.objectContaining({
          order: expect.objectContaining({ kind: "no_op", to: "pending" }),
          payment: expect.objectContaining({ kind: "apply", to: "paid" }),
        }),
      }),
    );
  });
});
