import { describe, expect, it, vi, beforeEach } from "vitest";
import { calculateReservationDelta, releaseVariantStockReservation } from "./stock-reservation";

const mocks = vi.hoisted(() => ({
  warn: vi.fn(),
  lockVariantForUpdate: vi.fn(),
}));

vi.mock("@/lib/utils/logger", () => ({
  logger: { warn: mocks.warn, info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("./stock-balance", () => ({
  lockVariantForUpdate: mocks.lockVariantForUpdate,
}));

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

describe("releaseVariantStockReservation", () => {
  beforeEach(() => {
    mocks.warn.mockReset();
    mocks.lockVariantForUpdate.mockReset();
  });

  it("does not warn when the reserved balance covers the release", async () => {
    mocks.lockVariantForUpdate.mockResolvedValue({
      id: "variant-1",
      stock: 8,
      stockReserved: 3,
      sku: "SKU-1",
    });
    const tx = { $executeRaw: vi.fn().mockResolvedValue(1) };

    await releaseVariantStockReservation(tx as never, "variant-1", 2, { requestId: "req-1" });

    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(mocks.warn).not.toHaveBeenCalled();
  });

  it("clamps over-release to zero and logs a structured warning without throwing", async () => {
    mocks.lockVariantForUpdate.mockResolvedValue({
      id: "variant-1",
      stock: 8,
      stockReserved: 1,
      sku: "SKU-1",
    });
    const tx = { $executeRaw: vi.fn().mockResolvedValue(1) };

    await expect(
      releaseVariantStockReservation(tx as never, "variant-1", 4, { requestId: "req-cart-1" }),
    ).resolves.toBeUndefined();

    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(mocks.warn).toHaveBeenCalledWith(
      "Stock reservation over-release clamped to zero",
      expect.objectContaining({
        requestId: "req-cart-1",
        variantId: "variant-1",
        quantityDelta: 4,
        previousReserved: 1,
        nextReserved: 0,
      }),
    );
  });
});
