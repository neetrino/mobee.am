import { beforeEach, describe, expect, it } from "vitest";
import { readGuestCart, upsertGuestCartItem } from "./guest-cart";

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
      value: {},
    });
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: createStorageMock(),
    });
    localStorage.clear();
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
});
