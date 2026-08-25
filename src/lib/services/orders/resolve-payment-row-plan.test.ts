import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors/app-error";
import { planPaymentRowChange } from "./plan-payment-row";
import { resolveRequestedPaymentRowPlan } from "./resolve-payment-row-plan";
import { planOrderTransitions } from "./plan-order-transitions";

const pendingPayment = {
  id: "pay-1",
  status: "pending",
  createdAt: new Date("2026-01-01"),
};

describe("resolveRequestedPaymentRowPlan", () => {
  it("returns 409 when the order has no payment row", () => {
    const planned = planOrderTransitions(
      { status: "pending", paymentStatus: "pending", fulfillmentStatus: "unfulfilled" },
      { paymentStatus: "paid" },
    );
    expect(() =>
      resolveRequestedPaymentRowPlan({
        latestPayment: null,
        orderPaymentPlan: planned.payment,
      }),
    ).toThrow(AppError);
  });

  it("rejects Order paid + Payment pending → refunded", () => {
    const planned = planOrderTransitions(
      { status: "pending", paymentStatus: "paid", fulfillmentStatus: "unfulfilled" },
      { paymentStatus: "refunded" },
    );
    expect(() =>
      resolveRequestedPaymentRowPlan({
        latestPayment: pendingPayment,
        orderPaymentPlan: planned.payment,
      }),
    ).toThrow(/Cannot change payment from pending to refunded/);
  });

  it("allows Order pending + Payment failed → pending as a payment-row write", () => {
    const planned = planOrderTransitions(
      { status: "pending", paymentStatus: "pending", fulfillmentStatus: "unfulfilled" },
      { paymentStatus: "pending" },
    );
    const resolved = resolveRequestedPaymentRowPlan({
      latestPayment: { ...pendingPayment, status: "failed" },
      orderPaymentPlan: planned.payment,
    });
    expect(planned.payment.kind).toBe("no_op");
    expect(resolved.rowChange.kind).toBe("apply");
    expect(resolved.rowChange.fromStored).toBe("failed");
    expect(resolved.rowChange.to).toBe("pending");
  });

  it("allows Order pending + Payment paid → paid as an order write and payment no-op", () => {
    const planned = planOrderTransitions(
      { status: "pending", paymentStatus: "pending", fulfillmentStatus: "unfulfilled" },
      { paymentStatus: "paid" },
    );
    const resolved = resolveRequestedPaymentRowPlan({
      latestPayment: { ...pendingPayment, status: "paid" },
      orderPaymentPlan: planned.payment,
    });
    expect(planned.payment.kind).toBe("apply");
    expect(resolved.rowChange.kind).toBe("no_op");
    expect(planPaymentRowChange("paid", "paid").kind).toBe("no_op");
  });
});
