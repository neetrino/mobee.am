export interface GuestCartItem {
  productId: string;
  productSlug: string;
  variantId: string;
  quantity: number;
}

const GUEST_CART_STORAGE_KEY = "shop_cart_guest";

function isGuestCartItem(value: unknown): value is GuestCartItem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<GuestCartItem>;
  return (
    typeof candidate.productId === "string" &&
    typeof candidate.productSlug === "string" &&
    typeof candidate.variantId === "string" &&
    typeof candidate.quantity === "number"
  );
}

export function readGuestCart(): GuestCartItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = localStorage.getItem(GUEST_CART_STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isGuestCartItem);
  } catch {
    return [];
  }
}

export function upsertGuestCartItem(item: GuestCartItem): void {
  if (typeof window === "undefined") {
    return;
  }

  const cart = readGuestCart();
  const existingItem = cart.find((entry) => entry.variantId === item.variantId);

  if (existingItem) {
    existingItem.quantity += item.quantity;
  } else {
    cart.push(item);
  }

  localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(cart));
}
