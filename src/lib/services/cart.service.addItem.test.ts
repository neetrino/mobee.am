import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@white-shop/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@white-shop/db")>();
  return {
    ...actual,
    db: {
      productVariant: {
        findUnique: mocks.findUnique,
      },
      $transaction: mocks.transaction,
    },
  };
});

import { cartService } from "./cart.service";

describe("cartService.addItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws 404 before transaction when variant is missing", async () => {
    mocks.findUnique.mockResolvedValue(null);
    await expect(
      cartService.addItem("user-1", { productId: "p-1", variantId: "v-missing" }),
    ).rejects.toMatchObject({ status: 404, title: "Variant not found" });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("throws 404 before transaction when variant is unpublished", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "v-1",
      published: false,
      productId: "p-1",
      price: 100,
    });
    await expect(
      cartService.addItem("user-1", { productId: "p-1", variantId: "v-1" }),
    ).rejects.toMatchObject({ status: 404, title: "Variant not found" });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("does not reject when client productId differs from DB variant.productId (server uses variant owner)", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "v-1",
      published: true,
      productId: "p-canonical",
      price: 100,
    });

    const cartFindFirst = vi.fn().mockResolvedValue(null);
    const cartCreate = vi.fn().mockResolvedValue({ id: "cart-1" });
    const cartItemFindFirst = vi.fn().mockResolvedValue(null);
    const cartItemCreate = vi.fn().mockResolvedValue({
      id: "item-1",
      quantity: 1,
      priceSnapshot: 100,
    });
    const cartItemFindMany = vi.fn().mockResolvedValue([{ quantity: 1, priceSnapshot: 100 }]);

    mocks.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        cart: { findFirst: cartFindFirst, create: cartCreate },
        cartItem: {
          findFirst: cartItemFindFirst,
          create: cartItemCreate,
          findMany: cartItemFindMany,
          update: vi.fn(),
        },
        $executeRaw: vi.fn().mockResolvedValue(1),
      };
      return fn(tx);
    });

    await cartService.addItem("user-1", {
      productId: "p-stale-from-client",
      variantId: "v-1",
      quantity: 1,
    });

    expect(cartItemCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          productId: "p-canonical",
          variantId: "v-1",
        }),
      }),
    );
  });
});
