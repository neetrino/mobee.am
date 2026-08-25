import { describe, expect, it } from "vitest";
import {
  canTransitionFulfillmentStatus,
  FULFILLMENT_STATUSES,
  getEligibleFulfillmentStatuses,
  isFulfillmentStatus,
  isTerminalFulfillmentStatus,
} from "./fulfillment-status";

const ALLOWED: Array<[string, string]> = [
  ["unfulfilled", "fulfilled"],
  ["unfulfilled", "shipped"],
  ["fulfilled", "shipped"],
  ["shipped", "delivered"],
];

const FORBIDDEN: Array<[string, string]> = [
  ["unfulfilled", "delivered"],
  ["fulfilled", "unfulfilled"],
  ["fulfilled", "delivered"],
  ["shipped", "unfulfilled"],
  ["shipped", "fulfilled"],
  ["delivered", "unfulfilled"],
  ["delivered", "fulfilled"],
  ["delivered", "shipped"],
];

describe("fulfillment-status FSM", () => {
  it("uses Mobee lowercase fulfillment statuses", () => {
    expect(FULFILLMENT_STATUSES).toEqual(["unfulfilled", "fulfilled", "shipped", "delivered"]);
    expect(isFulfillmentStatus("unfulfilled")).toBe(true);
    expect(isFulfillmentStatus("SHIPPED")).toBe(false);
  });

  it.each(ALLOWED)("allows %s → %s", (from, to) => {
    expect(canTransitionFulfillmentStatus(from as "unfulfilled", to as "shipped")).toBe(true);
  });

  it.each(FORBIDDEN)("rejects %s → %s", (from, to) => {
    expect(canTransitionFulfillmentStatus(from as "delivered", to as "shipped")).toBe(false);
  });

  it("treats delivered as terminal", () => {
    expect(isTerminalFulfillmentStatus("delivered")).toBe(true);
    expect(getEligibleFulfillmentStatuses("delivered")).toEqual([]);
    expect(getEligibleFulfillmentStatuses("unfulfilled")).toEqual(["fulfilled", "shipped"]);
  });
});
