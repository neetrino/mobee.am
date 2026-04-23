import { apiClient } from "../api-client";
import { logger } from "../utils/logger";

export interface GuestCartItem {
  productId: string;
  productSlug?: string;
  variantId: string;
  quantity: number;
}

export interface GuestCartHydratedItem {
  id: string;
  variant: {
    id: string;
    sku: string;
    stock?: number;
    product: {
      id: string;
      title: string;
      slug: string;
      image?: string | null;
    };
  };
  quantity: number;
  price: number;
  originalPrice?: number | null;
  total: number;
}

export interface GuestCartHydrated {
  id: "guest-cart";
  items: GuestCartHydratedItem[];
  totals: {
    subtotal: number;
    discount: number;
    shipping: number;
    tax: number;
    total: number;
    currency: "AMD";
  };
  itemsCount: number;
}

interface ProductData {
  id: string;
  slug: string;
  translations?: Array<{ title: string; locale: string }>;
  media?: Array<{ url?: string; src?: string } | string>;
  variants?: Array<{
    _id?: string;
    id: string;
    sku: string;
    price: number;
    originalPrice?: number | null;
    stock?: number;
  }>;
}

interface MergeResult {
  merged: GuestCartItem[];
  failed: GuestCartItem[];
}

const GUEST_CART_STORAGE_KEY = "shop_cart_guest";

export function getGuestCartStorageKey() {
  return GUEST_CART_STORAGE_KEY;
}

function isGuestCartItem(value: unknown): value is GuestCartItem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<GuestCartItem>;
  return (
    typeof candidate.productId === "string" &&
    (candidate.productSlug === undefined || typeof candidate.productSlug === "string") &&
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

export function updateGuestCartItemQuantity(variantId: string, quantity: number): void {
  if (typeof window === "undefined") {
    return;
  }

  if (quantity < 1) {
    removeGuestCartItem(variantId);
    return;
  }

  const cart = readGuestCart();
  const existingItem = cart.find((entry) => entry.variantId === variantId);
  if (!existingItem) {
    return;
  }

  existingItem.quantity = quantity;
  localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event("cart-updated"));
}

export function removeGuestCartItem(variantId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const cart = readGuestCart();
  const updated = cart.filter((item) => item.variantId !== variantId);
  localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event("cart-updated"));
}

export function clearGuestCart(): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(GUEST_CART_STORAGE_KEY);
  window.dispatchEvent(new Event("cart-updated"));
}

function buildGuestCart(items: GuestCartHydratedItem[]): GuestCartHydrated {
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const itemsCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    id: "guest-cart",
    items,
    totals: {
      subtotal,
      discount: 0,
      shipping: 0,
      tax: 0,
      total: subtotal,
      currency: "AMD",
    },
    itemsCount,
  };
}

async function fetchGuestCartItemDetails(
  item: GuestCartItem,
  index: number,
  t: (key: string) => string
): Promise<{ item: GuestCartHydratedItem | null; shouldRemove: boolean }> {
  try {
    if (!item.productSlug) {
      return { item: null, shouldRemove: true };
    }

    const productData = await apiClient.get<ProductData>(`/api/v1/products/${item.productSlug}`);
    const variant =
      productData.variants?.find((entry) => (entry._id?.toString() || entry.id) === item.variantId) ||
      productData.variants?.[0];

    if (!variant) {
      return { item: null, shouldRemove: true };
    }

    const translation = productData.translations?.[0];
    const imageUrl = productData.media?.[0]
      ? typeof productData.media[0] === "string"
        ? productData.media[0]
        : productData.media[0].url || productData.media[0].src
      : null;

    return {
      item: {
        id: `${item.productId}-${item.variantId}-${index}`,
        variant: {
          id: variant._id?.toString() || variant.id,
          sku: variant.sku || "",
          stock: variant.stock,
          product: {
            id: productData.id,
            title: translation?.title || t("common.messages.product"),
            slug: productData.slug,
            image: imageUrl,
          },
        },
        quantity: item.quantity,
        price: variant.price,
        originalPrice: variant.originalPrice || null,
        total: variant.price * item.quantity,
      },
      shouldRemove: false,
    };
  } catch (error: unknown) {
    const errorObj = error as { status?: number; statusCode?: number };
    if (errorObj?.status === 404 || errorObj?.statusCode === 404) {
      return { item: null, shouldRemove: true };
    }
    logger.error("Failed to fetch guest cart item details", { error, item });
    return { item: null, shouldRemove: false };
  }
}

export async function fetchGuestCartHydrated(
  t: (key: string) => string
): Promise<GuestCartHydrated | null> {
  if (typeof window === "undefined") {
    return null;
  }

  const guestItems = readGuestCart();
  if (guestItems.length === 0) {
    return null;
  }

  const resolvedItems = await Promise.all(
    guestItems.map((item, index) => fetchGuestCartItemDetails(item, index, t))
  );

  const indexesToRemove = resolvedItems
    .map((result, index) => (result.shouldRemove ? index : -1))
    .filter((index) => index !== -1);

  if (indexesToRemove.length > 0) {
    const filtered = guestItems.filter((_, index) => !indexesToRemove.includes(index));
    localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(filtered));
  }

  const validItems = resolvedItems
    .map((result) => result.item)
    .filter((item): item is GuestCartHydratedItem => item !== null);

  if (validItems.length === 0) {
    return null;
  }

  return buildGuestCart(validItems);
}

async function mergeGuestCartItem(item: GuestCartItem): Promise<boolean> {
  try {
    await apiClient.post("/api/v1/cart/items", {
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
    });
    return true;
  } catch (error: unknown) {
    logger.warn("Failed to merge guest cart item", { error, item });
    return false;
  }
}

async function mergeGuestCartItems(items: GuestCartItem[]): Promise<MergeResult> {
  const sortedItems = [...items].sort((a, b) =>
    `${a.productId}:${a.variantId}`.localeCompare(`${b.productId}:${b.variantId}`)
  );

  const merged: GuestCartItem[] = [];
  const failed: GuestCartItem[] = [];

  for (const item of sortedItems) {
    const success = await mergeGuestCartItem(item);
    if (success) {
      merged.push(item);
      continue;
    }
    failed.push(item);
  }

  return { merged, failed };
}

export async function mergeGuestCartIntoUserCart(): Promise<MergeResult> {
  if (typeof window === "undefined") {
    return { merged: [], failed: [] };
  }

  const items = readGuestCart();
  if (items.length === 0) {
    return { merged: [], failed: [] };
  }

  const result = await mergeGuestCartItems(items);
  localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(result.failed));
  window.dispatchEvent(new Event("cart-updated"));
  return result;
}
