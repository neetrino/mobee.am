import { describe, expect, it, vi, beforeEach } from "vitest";
import { AppError } from "@/lib/errors/app-error";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  lockOrderForUpdate: vi.fn(),
  findUnique: vi.fn(),
  delete: vi.fn(),
  createAuditLog: vi.fn(),
}));

vi.mock("@white-shop/db", () => ({
  Prisma: {},
  db: {
    $transaction: mocks.transaction,
  },
}));

vi.mock("./lock-order", () => ({
  lockOrderForUpdate: mocks.lockOrderForUpdate,
}));

vi.mock("../audit/write-audit-log", () => ({
  createAuditLog: mocks.createAuditLog,
}));

vi.mock("@/lib/utils/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { deleteEmptyOrder } from "./delete-empty-order";

const context = {
  requestId: "req-del-1",
  actorUserId: "admin-1",
  source: "admin" as const,
};

const locked = {
  id: "order-2",
  number: "1002",
  status: "pending",
  paymentStatus: "pending",
  fulfillmentStatus: "unfulfilled",
  paidAt: null,
  fulfilledAt: null,
  cancelledAt: null,
};

describe("deleteEmptyOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({
        order: { findUnique: mocks.findUnique, delete: mocks.delete },
      }),
    );
    mocks.createAuditLog.mockResolvedValue(undefined);
    mocks.delete.mockResolvedValue({});
  });

  it("rejects commerce orders with items or payments without deleting", async () => {
    mocks.lockOrderForUpdate.mockResolvedValue(locked);
    mocks.findUnique.mockResolvedValue({
      _count: { items: 1, payments: 1, stockMovements: 0 },
    });

    await expect(deleteEmptyOrder("order-2", context)).rejects.toBeInstanceOf(AppError);
    expect(mocks.delete).not.toHaveBeenCalled();
    expect(mocks.createAuditLog).not.toHaveBeenCalled();
  });

  it("rejects orders with inventory history without deleting", async () => {
    mocks.lockOrderForUpdate.mockResolvedValue(locked);
    mocks.findUnique.mockResolvedValue({
      _count: { items: 0, payments: 0, stockMovements: 1 },
    });

    await expect(deleteEmptyOrder("order-2", context)).rejects.toMatchObject({ status: 409 });
    expect(mocks.delete).not.toHaveBeenCalled();
    expect(mocks.createAuditLog).not.toHaveBeenCalled();
  });

  it("locks, audits, then deletes an empty test order", async () => {
    mocks.lockOrderForUpdate.mockResolvedValue(locked);
    mocks.findUnique.mockResolvedValue({
      _count: { items: 0, payments: 0, stockMovements: 0 },
    });

    await expect(deleteEmptyOrder("order-2", context)).resolves.toEqual({ success: true });
    expect(mocks.lockOrderForUpdate).toHaveBeenCalled();
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.anything(),
      context,
      expect.objectContaining({
        action: "order.delete_empty",
        targetType: "Order",
        targetId: "order-2",
        beforeDiff: expect.objectContaining({
          number: "1002",
          status: "pending",
          paymentStatus: "pending",
          fulfillmentStatus: "unfulfilled",
        }),
      }),
    );
    expect(mocks.delete).toHaveBeenCalledWith({ where: { id: "order-2" } });
  });
});
