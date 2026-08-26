import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cartFindFirst: vi.fn(),
  cartItemFindUnique: vi.fn(),
  transaction: vi.fn(),
  release: vi.fn(),
  reserve: vi.fn(),
}));

vi.mock("@white-shop/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@white-shop/db")>();
  return {
    ...actual,
    db: {
      cart: { findFirst: mocks.cartFindFirst },
      cartItem: { findUnique: mocks.cartItemFindUnique },
      $transaction: mocks.transaction,
    },
  };
});

vi.mock("./inventory/stock-reservation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./inventory/stock-reservation")>();
  return {
    ...actual,
    releaseVariantStockReservation: mocks.release,
    reserveVariantStock: mocks.reserve,
  };
});

import { cartService } from "./cart.service";

describe("cartService reservation requestId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (fn: (tx: Record<string, unknown>) => unknown) =>
      fn({
        cartItem: {
          update: vi.fn().mockResolvedValue({ id: "item-1", quantity: 1 }),
          delete: vi.fn().mockResolvedValue({}),
        },
      }),
    );
    mocks.release.mockResolvedValue(undefined);
  });

  it("passes requestId to release on quantity decrease", async () => {
    mocks.cartFindFirst.mockResolvedValue({
      id: "cart-1",
      items: [{ id: "item-1", variantId: "v-1", quantity: 4 }],
    });

    await cartService.updateItem("user-1", "item-1", 1, { requestId: "req-update-1" });

    expect(mocks.release).toHaveBeenCalledWith(expect.anything(), "v-1", 3, {
      requestId: "req-update-1",
    });
    expect(mocks.reserve).not.toHaveBeenCalled();
  });

  it("passes requestId to release on item remove", async () => {
    mocks.cartFindFirst.mockResolvedValue({ id: "cart-1" });
    mocks.cartItemFindUnique.mockResolvedValue({ variantId: "v-1", quantity: 2 });

    await cartService.removeItem("user-1", "item-1", { requestId: "req-remove-1" });

    expect(mocks.release).toHaveBeenCalledWith(expect.anything(), "v-1", 2, {
      requestId: "req-remove-1",
    });
  });
});
