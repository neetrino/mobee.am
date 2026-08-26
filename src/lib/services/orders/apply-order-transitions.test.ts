import { describe, expect, it, vi } from "vitest";
import { applyPlannedTransitions } from "./apply-order-transitions";
import { planOrderTransitions } from "./plan-order-transitions";
import { planPaymentRowChange } from "./plan-payment-row";
import type { CommerceRequestContext, LockedOrderRow } from "./order-transition.types";

const context: CommerceRequestContext = {
  requestId: "req-1",
  actorUserId: "admin-1",
  source: "admin",
};

const locked: LockedOrderRow = {
  id: "order-1",
  number: "1001",
  status: "pending",
  paymentStatus: "pending",
  fulfillmentStatus: "unfulfilled",
  paidAt: null,
  fulfilledAt: null,
  cancelledAt: null,
};

function createTx() {
  return {
    order: { update: vi.fn().mockResolvedValue({}) },
    orderItem: { findMany: vi.fn().mockResolvedValue([]) },
    payment: { update: vi.fn().mockResolvedValue({}) },
    orderEvent: { create: vi.fn().mockResolvedValue({}) },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    stockMovement: { create: vi.fn().mockResolvedValue({}) },
    $queryRaw: vi.fn().mockResolvedValue([]),
  };
}

describe("applyPlannedTransitions", () => {
  it("commits status, event, and admin audit together", async () => {
    const tx = createTx();
    const planned = planOrderTransitions(locked, { status: "processing" });

    await applyPlannedTransitions({
      tx: tx as never,
      context,
      locked,
      planned,
    });

    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: "order-1" },
      data: expect.objectContaining({ status: "processing" }),
    });
    expect(tx.orderEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "order_status_changed",
        fromState: "pending",
        toState: "processing",
        actorUserId: "admin-1",
        correlationId: "req-1",
      }),
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "order.update",
        targetId: "order-1",
        requestId: "req-1",
        correlationId: "req-1",
      }),
    });
  });

  it("rolls back the caller transaction when event write fails", async () => {
    const tx = createTx();
    tx.orderEvent.create.mockRejectedValue(new Error("event write failed"));
    const planned = planOrderTransitions(locked, { status: "processing" });

    await expect(
      applyPlannedTransitions({
        tx: tx as never,
        context,
        locked,
        planned,
      }),
    ).rejects.toThrow("event write failed");
  });

  it("keeps payment and order payment statuses on the same target", async () => {
    const tx = createTx();
    const planned = planOrderTransitions(locked, { paymentStatus: "paid" });

    await applyPlannedTransitions({
      tx: tx as never,
      context,
      locked,
      planned,
      paymentId: "pay-1",
      paymentRowChange: planPaymentRowChange("pending", "paid"),
    });

    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: "order-1" },
      data: expect.objectContaining({
        paymentStatus: "paid",
        paidAt: expect.any(Date),
      }),
    });
    expect(tx.payment.update).toHaveBeenCalledWith({
      where: { id: "pay-1" },
      data: expect.objectContaining({
        status: "paid",
        completedAt: expect.any(Date),
      }),
    });
  });

  it("does not rewrite Payment timestamps on a payment-row no-op", async () => {
    const tx = createTx();
    const planned = planOrderTransitions(locked, { paymentStatus: "paid" });

    await applyPlannedTransitions({
      tx: tx as never,
      context,
      locked,
      planned,
      paymentId: "pay-1",
      paymentRowChange: planPaymentRowChange("paid", "paid"),
    });

    expect(tx.order.update).toHaveBeenCalled();
    expect(tx.payment.update).not.toHaveBeenCalled();
    expect(tx.orderEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "payment_status_changed",
        data: expect.objectContaining({
          previousOrderPaymentStatus: "pending",
          previousPaymentStatus: "paid",
          target: "paid",
          reconciliation: true,
        }),
      }),
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        beforeDiff: expect.objectContaining({
          paymentStatus: "pending",
          paymentRowStatus: "paid",
        }),
      }),
    });
  });

  it("applies a payment-row reconciliation without rewriting Order.paymentStatus", async () => {
    const tx = createTx();
    const planned = planOrderTransitions(locked, { paymentStatus: "pending" });

    await applyPlannedTransitions({
      tx: tx as never,
      context,
      locked,
      planned,
      paymentId: "pay-1",
      paymentRowChange: planPaymentRowChange("failed", "pending"),
    });

    expect(tx.order.update).not.toHaveBeenCalled();
    expect(tx.payment.update).toHaveBeenCalledWith({
      where: { id: "pay-1" },
      data: expect.objectContaining({ status: "pending" }),
    });
    expect(tx.orderEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "payment_status_changed",
        fromState: "failed",
        toState: "pending",
        data: expect.objectContaining({
          previousOrderPaymentStatus: "pending",
          previousPaymentStatus: "failed",
          reconciliation: true,
        }),
      }),
    });
  });

  it("does not restock on confirmed → processing normalization", async () => {
    const tx = createTx();
    const confirmed = { ...locked, status: "confirmed" };
    const planned = planOrderTransitions(confirmed, { status: "processing" });

    await applyPlannedTransitions({
      tx: tx as never,
      context,
      locked: confirmed,
      planned,
    });

    expect(planned.isCancelRestock).toBe(false);
    expect(tx.orderItem.findMany).not.toHaveBeenCalled();
    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: "order-1" },
      data: expect.objectContaining({ status: "processing" }),
    });
    expect(tx.orderEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        fromState: "confirmed",
        toState: "processing",
      }),
    });
  });
});
