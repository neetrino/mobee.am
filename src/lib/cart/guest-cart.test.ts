import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../api-client";
import {
  clearGuestCart,
  mergeGuestCartIntoUserCart,
  readGuestCart,
  removeGuestCartItem,
  upsertGuestCartItem,
  updateGuestCartItemQuantity,
} from "./guest-cart";

vi.mock("../api-client", () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

function createStorageMock(): Storage {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

describe("guest cart helpers", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        dispatchEvent: vi.fn(),
      },
    });
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: createStorageMock(),
    });
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("stores a new guest cart item", () => {
    upsertGuestCartItem({
      productId: "product-1",
      productSlug: "product-1",
      variantId: "variant-1",
      quantity: 1,
    });

    expect(readGuestCart()).toEqual([
      {
        productId: "product-1",
        productSlug: "product-1",
        variantId: "variant-1",
        quantity: 1,
      },
    ]);
  });

  it("increments quantity for existing variant", () => {
    upsertGuestCartItem({
      productId: "product-1",
      productSlug: "product-1",
      variantId: "variant-1",
      quantity: 1,
    });

    upsertGuestCartItem({
      productId: "product-1",
      productSlug: "product-1",
      variantId: "variant-1",
      quantity: 2,
    });

    expect(readGuestCart()).toEqual([
      {
        productId: "product-1",
        productSlug: "product-1",
        variantId: "variant-1",
        quantity: 3,
      },
    ]);
  });

  it("updates item quantity", () => {
    upsertGuestCartItem({
      productId: "product-1",
      productSlug: "product-1",
      variantId: "variant-1",
      quantity: 1,
    });

    updateGuestCartItemQuantity("variant-1", 5);

    expect(readGuestCart()).toEqual([
      {
        productId: "product-1",
        productSlug: "product-1",
        variantId: "variant-1",
        quantity: 5,
      },
    ]);
  });

  it("removes item by variant id", () => {
    upsertGuestCartItem({
      productId: "product-1",
      productSlug: "product-1",
      variantId: "variant-1",
      quantity: 1,
    });
    upsertGuestCartItem({
      productId: "product-2",
      productSlug: "product-2",
      variantId: "variant-2",
      quantity: 2,
    });

    removeGuestCartItem("variant-1");

    expect(readGuestCart()).toEqual([
      {
        productId: "product-2",
        productSlug: "product-2",
        variantId: "variant-2",
        quantity: 2,
      },
    ]);
  });

  it("merges guest cart and keeps failed items", async () => {
    upsertGuestCartItem({
      productId: "product-1",
      productSlug: "product-1",
      variantId: "variant-1",
      quantity: 1,
    });
    upsertGuestCartItem({
      productId: "product-2",
      productSlug: "product-2",
      variantId: "variant-2",
      quantity: 2,
    });

    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({ ok: true })
      .mockRejectedValueOnce(new Error("stock error"));

    const result = await mergeGuestCartIntoUserCart();

    expect(result.merged).toHaveLength(1);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].variantId).toBe("variant-2");
    expect(readGuestCart()).toEqual([
      {
        productId: "product-2",
        productSlug: "product-2",
        variantId: "variant-2",
        quantity: 2,
      },
    ]);
  });

  it("clears guest cart", () => {
    upsertGuestCartItem({
      productId: "product-1",
      productSlug: "product-1",
      variantId: "variant-1",
      quantity: 1,
    });

    clearGuestCart();

    expect(readGuestCart()).toEqual([]);
  });
});
