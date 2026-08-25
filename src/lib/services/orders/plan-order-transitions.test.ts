import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors/app-error";
import { assertCrossStateInvariants } from "./cross-state";
import { planOrderTransitions } from "./plan-order-transitions";

const BASE = {
  status: "pending",
  paymentStatus: "pending",
  fulfillmentStatus: "unfulfilled",
};

describe("cross-state invariants", () => {
  it("blocks fulfillment changes on cancelled orders", () => {
    expect(() =>
      assertCrossStateInvariants({
        current: { status: "cancelled", fulfillmentStatus: "unfulfilled" },
        final: { status: "cancelled", fulfillmentStatus: "shipped" },
        fulfillmentChanging: true,
      }),
    ).toThrow(AppError);
  });

  it("blocks cancelling a delivered order", () => {
    expect(() =>
      assertCrossStateInvariants({
        current: { status: "processing", fulfillmentStatus: "delivered" },
        final: { status: "cancelled", fulfillmentStatus: "delivered" },
        fulfillmentChanging: false,
      }),
    ).toThrow(AppError);
  });

  it("allows cancel while fulfillment stays unfulfilled", () => {
    expect(() =>
      assertCrossStateInvariants({
        current: { status: "pending", fulfillmentStatus: "unfulfilled" },
        final: { status: "cancelled", fulfillmentStatus: "unfulfilled" },
        fulfillmentChanging: false,
      }),
    ).not.toThrow();
  });
});

describe("planOrderTransitions", () => {
  it("returns no-op for same-state canonical updates", () => {
    const planned = planOrderTransitions(BASE, { status: "pending" });
    expect(planned.kind).toBe("no_op");
    expect(planned.order.kind).toBe("no_op");
    expect(planned.isCancelRestock).toBe(false);
  });

  it("treats confirmed → processing as normalization, not no-op", () => {
    const planned = planOrderTransitions(
      { ...BASE, status: "confirmed" },
      { status: "processing" },
    );
    expect(planned.kind).toBe("apply");
    expect(planned.order.kind).toBe("normalize");
    expect(planned.order.fromStored).toBe("confirmed");
    expect(planned.order.to).toBe("processing");
    expect(planned.isCancelRestock).toBe(false);
  });

  it("restocks when normalizing confirmed via cancel", () => {
    const planned = planOrderTransitions(
      { ...BASE, status: "confirmed" },
      { status: "cancelled" },
    );
    expect(planned.order.kind).toBe("apply");
    expect(planned.order.fromCanonical).toBe("processing");
    expect(planned.isCancelRestock).toBe(true);
  });

  it("rejects confirmed as a public target status", () => {
    expect(() => planOrderTransitions(BASE, { status: "confirmed" })).toThrow(AppError);
  });

  it("rejects completed → cancelled", () => {
    expect(() =>
      planOrderTransitions({ ...BASE, status: "completed" }, { status: "cancelled" }),
    ).toThrow(AppError);
  });

  it("rejects paid → failed", () => {
    expect(() =>
      planOrderTransitions({ ...BASE, paymentStatus: "paid" }, { paymentStatus: "failed" }),
    ).toThrow(AppError);
  });

  it("rejects refunded → paid", () => {
    expect(() =>
      planOrderTransitions(
        { ...BASE, paymentStatus: "refunded" },
        { paymentStatus: "paid" },
      ),
    ).toThrow(AppError);
  });

  it("rejects backward fulfillment and skip to delivered", () => {
    expect(() =>
      planOrderTransitions(
        { ...BASE, fulfillmentStatus: "shipped" },
        { fulfillmentStatus: "fulfilled" },
      ),
    ).toThrow(AppError);
    expect(() =>
      planOrderTransitions(BASE, { fulfillmentStatus: "delivered" }),
    ).toThrow(AppError);
  });

  it("rejects multi-field cancel + ship as a final combination", () => {
    expect(() =>
      planOrderTransitions(BASE, { status: "cancelled", fulfillmentStatus: "shipped" }),
    ).toThrow(AppError);
  });

  it("rejects cancelling a delivered order", () => {
    expect(() =>
      planOrderTransitions(
        { ...BASE, status: "processing", fulfillmentStatus: "delivered" },
        { status: "cancelled" },
      ),
    ).toThrow(AppError);
  });

  it("allows unpaid completion for COD", () => {
    const planned = planOrderTransitions(
      { ...BASE, status: "processing" },
      { status: "completed" },
    );
    expect(planned.final.status).toBe("completed");
    expect(planned.final.paymentStatus).toBe("pending");
    expect(planned.isCancelRestock).toBe(false);
  });

  it("allows refund without restock", () => {
    const planned = planOrderTransitions(
      { ...BASE, paymentStatus: "paid" },
      { paymentStatus: "refunded" },
    );
    expect(planned.payment.kind).toBe("apply");
    expect(planned.isCancelRestock).toBe(false);
  });
});
