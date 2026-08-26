import { describe, expect, it } from "vitest";
import {
  canTransitionPaymentStatus,
  getEligiblePaymentStatuses,
  isPaymentStatus,
  isTerminalPaymentStatus,
  PAYMENT_STATUSES,
} from "./payment-status";

const ALLOWED: Array<[string, string]> = [
  ["pending", "paid"],
  ["pending", "failed"],
  ["failed", "pending"],
  ["paid", "refunded"],
];

const FORBIDDEN: Array<[string, string]> = [
  ["pending", "refunded"],
  ["paid", "pending"],
  ["paid", "failed"],
  ["failed", "paid"],
  ["failed", "refunded"],
  ["refunded", "pending"],
  ["refunded", "paid"],
  ["refunded", "failed"],
];

describe("payment-status FSM", () => {
  it("uses Mobee lowercase payment statuses", () => {
    expect(PAYMENT_STATUSES).toEqual(["pending", "paid", "failed", "refunded"]);
    expect(isPaymentStatus("paid")).toBe(true);
    expect(isPaymentStatus("CAPTURED")).toBe(false);
  });

  it.each(ALLOWED)("allows %s → %s", (from, to) => {
    expect(canTransitionPaymentStatus(from as "pending", to as "paid")).toBe(true);
  });

  it.each(FORBIDDEN)("rejects %s → %s", (from, to) => {
    expect(canTransitionPaymentStatus(from as "paid", to as "failed")).toBe(false);
  });

  it("treats refunded as terminal", () => {
    expect(isTerminalPaymentStatus("refunded")).toBe(true);
    expect(getEligiblePaymentStatuses("refunded")).toEqual([]);
    expect(getEligiblePaymentStatuses("pending")).toEqual(["paid", "failed"]);
  });
});
