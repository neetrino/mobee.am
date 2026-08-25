import { describe, expect, it } from "vitest";
import {
  canonicalizeOrderStatus,
  canTransitionOrderStatus,
  getEligibleOrderStatuses,
  isLegacyConfirmedOrderStatus,
  isOrderStatus,
  isTerminalOrderStatus,
  ORDER_STATUSES,
} from "./order-status";

const ALLOWED: Array<[string, string]> = [
  ["pending", "processing"],
  ["pending", "cancelled"],
  ["processing", "completed"],
  ["processing", "cancelled"],
];

const FORBIDDEN: Array<[string, string]> = [
  ["pending", "completed"],
  ["processing", "pending"],
  ["completed", "pending"],
  ["completed", "processing"],
  ["completed", "cancelled"],
  ["cancelled", "pending"],
  ["cancelled", "processing"],
  ["cancelled", "completed"],
];

describe("order-status FSM", () => {
  it("accepts only canonical public statuses", () => {
    expect(ORDER_STATUSES).toEqual(["pending", "processing", "completed", "cancelled"]);
    expect(isOrderStatus("pending")).toBe(true);
    expect(isOrderStatus("confirmed")).toBe(false);
    expect(isLegacyConfirmedOrderStatus("confirmed")).toBe(true);
    expect(canonicalizeOrderStatus("confirmed")).toBe("processing");
    expect(canonicalizeOrderStatus("unknown")).toBeNull();
  });

  it.each(ALLOWED)("allows %s → %s", (from, to) => {
    expect(canTransitionOrderStatus(from as "pending", to as "processing")).toBe(true);
  });

  it.each(FORBIDDEN)("rejects %s → %s", (from, to) => {
    expect(canTransitionOrderStatus(from as "completed", to as "cancelled")).toBe(false);
  });

  it("treats completed and cancelled as terminal", () => {
    expect(isTerminalOrderStatus("completed")).toBe(true);
    expect(isTerminalOrderStatus("cancelled")).toBe(true);
    expect(getEligibleOrderStatuses("completed")).toEqual([]);
    expect(getEligibleOrderStatuses("cancelled")).toEqual([]);
    expect(getEligibleOrderStatuses("pending")).toEqual(["processing", "cancelled"]);
  });
});
