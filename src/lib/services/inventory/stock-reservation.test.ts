import { describe, expect, it } from "vitest";
import { calculateReservationDelta } from "./stock-reservation";

describe("calculateReservationDelta", () => {
  it("returns positive delta for reservation increase", () => {
    expect(
      calculateReservationDelta({
        previousQuantity: 1,
        nextQuantity: 4,
      })
    ).toBe(3);
  });

  it("returns negative delta for reservation release", () => {
    expect(
      calculateReservationDelta({
        previousQuantity: 5,
        nextQuantity: 2,
      })
    ).toBe(-3);
  });

  it("returns zero delta for unchanged quantity", () => {
    expect(
      calculateReservationDelta({
        previousQuantity: 3,
        nextQuantity: 3,
      })
    ).toBe(0);
  });
});
