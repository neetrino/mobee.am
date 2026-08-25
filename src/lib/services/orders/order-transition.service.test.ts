import { describe, expect, it, vi, beforeEach } from "vitest";
import { AppError } from "@/lib/errors/app-error";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  lockOrderForUpdate: vi.fn(),
  findLatestPayment: vi.fn(),
  applyPlannedTransitions: vi.fn(),
  loadOrder: vi.fn(),
}));

vi.mock("@white-shop/db", () => ({
  Prisma: {},
  db: {
    $transaction: mocks.transaction,
    order: { findUnique: mocks.loadOrder },
  },
}));

vi.mock("./lock-order", () => ({
  lockOrderForUpdate: mocks.lockOrderForUpdate,
}));

vi.mock("./payment-row", () => ({
  findLatestPayment: mocks.findLatestPayment,
}));

vi.mock("./apply-order-transitions", () => ({
  applyPlannedTransitions: mocks.applyPlannedTransitions,
}));

import { updateOrderStatuses } from "./order-transition.service";

const context = {
  requestId: "req-1",
  actorUserId: "admin-1",
  source: "admin" as const,
};

const locked = {
  id: "order-1",
  number: "1001",
  status: "pending",
  paymentStatus: "pending",
  fulfillmentStatus: "unfulfilled",
  paidAt: null,
  fulfilledAt: null,
  cancelledAt: null,
};

describe("updateOrderStatuses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (fn: (tx: { order: { findUnique: typeof mocks.loadOrder } }) => unknown) =>
      fn({ order: { findUnique: mocks.loadOrder } }),
    );
    mocks.loadOrder.mockResolvedValue({ id: "order-1", status: "pending", items: [], payments: [] });
  });

  it("does not write on same-state no-op", async () => {
    mocks.lockOrderForUpdate.mockResolvedValue(locked);
    await updateOrderStatuses("order-1", { status: "pending" }, context);
    expect(mocks.findLatestPayment).not.toHaveBeenCalled();
    expect(mocks.applyPlannedTransitions).not.toHaveBeenCalled();
  });

  it("applies a real transition after lock", async () => {
    mocks.lockOrderForUpdate.mockResolvedValue(locked);
    mocks.applyPlannedTransitions.mockResolvedValue(undefined);
    mocks.loadOrder.mockResolvedValue({ id: "order-1", status: "processing", items: [], payments: [] });

    const result = await updateOrderStatuses("order-1", { status: "processing" }, context);
    expect(mocks.findLatestPayment).not.toHaveBeenCalled();
    expect(mocks.applyPlannedTransitions).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ status: "processing" });
  });

  it("returns 404 when the locked order is missing", async () => {
    mocks.lockOrderForUpdate.mockResolvedValue(null);
    await expect(updateOrderStatuses("missing", { status: "processing" }, context)).rejects.toBeInstanceOf(
      AppError,
    );
  });

  it("returns 409 without writes when paymentStatus is requested and no payment exists", async () => {
    mocks.lockOrderForUpdate.mockResolvedValue(locked);
    mocks.findLatestPayment.mockResolvedValue(null);

    await expect(
      updateOrderStatuses("order-1", { paymentStatus: "paid" }, context),
    ).rejects.toBeInstanceOf(AppError);
    expect(mocks.applyPlannedTransitions).not.toHaveBeenCalled();
  });

  it("returns 409 without writes for Order paid + Payment pending → refunded", async () => {
    mocks.lockOrderForUpdate.mockResolvedValue({ ...locked, paymentStatus: "paid" });
    mocks.findLatestPayment.mockResolvedValue({
      id: "pay-1",
      status: "pending",
      createdAt: new Date("2026-01-01"),
    });

    await expect(
      updateOrderStatuses("order-1", { paymentStatus: "refunded" }, context),
    ).rejects.toMatchObject({ status: 409 });
    expect(mocks.applyPlannedTransitions).not.toHaveBeenCalled();
  });

  it("reconciles Order pending + Payment failed → pending without treating it as a no-op", async () => {
    mocks.lockOrderForUpdate.mockResolvedValue(locked);
    mocks.findLatestPayment.mockResolvedValue({
      id: "pay-1",
      status: "failed",
      createdAt: new Date("2026-01-01"),
    });
    mocks.applyPlannedTransitions.mockResolvedValue(undefined);

    await updateOrderStatuses("order-1", { paymentStatus: "pending" }, context);

    expect(mocks.applyPlannedTransitions).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentId: "pay-1",
        paymentRowChange: expect.objectContaining({
          kind: "apply",
          fromStored: "failed",
          to: "pending",
        }),
        planned: expect.objectContaining({
          kind: "no_op",
          payment: expect.objectContaining({ kind: "no_op" }),
        }),
      }),
    );
  });
});
