import { describe, expect, it } from "vitest";
import { availableUnreservedStock, hasUnreservedQuantity } from "./available-stock";

describe("availableUnreservedStock", () => {
  it("subtracts reservations from on-hand stock", () => {
    expect(availableUnreservedStock(5, 4)).toBe(1);
    expect(availableUnreservedStock(5, 0)).toBe(5);
    expect(availableUnreservedStock(2, 2)).toBe(0);
  });

  it("does not go negative when reserved exceeds on-hand", () => {
    expect(availableUnreservedStock(1, 3)).toBe(0);
  });
});

describe("hasUnreservedQuantity", () => {
  it("rejects guest quantity that only fits in reserved stock", () => {
    expect(hasUnreservedQuantity(5, 4, 2)).toBe(false);
    expect(hasUnreservedQuantity(5, 4, 1)).toBe(true);
  });
});
