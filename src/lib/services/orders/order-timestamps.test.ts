import { describe, expect, it } from "vitest";
import { buildOrderTimestampPatch } from "./order-timestamps";
import { planOrderTransitions } from "./plan-order-transitions";
import type { LockedOrderRow } from "./order-transition.types";

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

describe("order timestamps", () => {
  const now = new Date("2026-08-25T12:00:00.000Z");

  it("sets paidAt only on first transition to paid", () => {
    const planned = planOrderTransitions(locked, { paymentStatus: "paid" });
    expect(
      buildOrderTimestampPatch({ locked, now, order: planned.order, payment: planned.payment, fulfillment: planned.fulfillment }),
    ).toEqual({ paidAt: now });

    const alreadyPaid = { ...locked, paymentStatus: "paid", paidAt: now };
    const same = planOrderTransitions(alreadyPaid, { paymentStatus: "paid" });
    expect(
      buildOrderTimestampPatch({
        locked: alreadyPaid,
        now: new Date("2026-08-26T12:00:00.000Z"),
        order: same.order,
        payment: same.payment,
        fulfillment: same.fulfillment,
      }),
    ).toEqual({});
  });

  it("sets fulfilledAt from fulfillment, not order completion", () => {
    const completed = planOrderTransitions(
      { ...locked, status: "processing" },
      { status: "completed" },
    );
    expect(
      buildOrderTimestampPatch({
        locked: { ...locked, status: "processing" },
        now,
        order: completed.order,
        payment: completed.payment,
        fulfillment: completed.fulfillment,
      }),
    ).toEqual({});

    const shipped = planOrderTransitions(locked, { fulfillmentStatus: "shipped" });
    expect(
      buildOrderTimestampPatch({
        locked,
        now,
        order: shipped.order,
        payment: shipped.payment,
        fulfillment: shipped.fulfillment,
      }),
    ).toEqual({ fulfilledAt: now });
  });
});
