import { apiClient } from "../api-client";
import { CART_MONEY_BASE_CURRENCY } from "../checkout/cart-money";
import { getStoredLanguage } from "../language";
import type { GuestCartHydrateLine } from "../services/guest-cart-hydrate.service";
import { logger } from "../utils/logger";

export interface GuestCartItemSnapshot {
  title: string;
  image?: string | null;
  price: number;
  originalPrice?: number | null;
  sku?: string;
  stock?: number;
}

export interface GuestCartItem {
  productId: string;
  productSlug?: string;
  variantId: string;
  quantity: number;
  snapshot?: GuestCartItemSnapshot;
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
    currency: typeof CART_MONEY_BASE_CURRENCY;
  };
  itemsCount: number;
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
    if (item.snapshot) {
      existingItem.snapshot = { ...existingItem.snapshot, ...item.snapshot };
    }
  } else {
    cart.push(item);
  }

  localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(cart));
}

export function updateGuestCartItemQuantity(
  variantId: string,
  quantity: number,
  options?: { emitEvent?: boolean },
): void {
  if (typeof window === "undefined") {
    return;
  }

  if (quantity < 1) {
    removeGuestCartItem(variantId, options);
    return;
  }

  const cart = readGuestCart();
  const existingItem = cart.find((entry) => entry.variantId === variantId);
  if (!existingItem) {
    return;
  }

  existingItem.quantity = quantity;
  localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(cart));
  if (options?.emitEvent !== false) {
    window.dispatchEvent(new Event("cart-updated"));
  }
}

export function removeGuestCartItem(
  variantId: string,
  options?: { emitEvent?: boolean },
): void {
  if (typeof window === "undefined") {
    return;
  }

  const cart = readGuestCart();
  const updated = cart.filter((item) => item.variantId !== variantId);
  localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(updated));
  if (options?.emitEvent !== false) {
    window.dispatchEvent(new Event("cart-updated"));
  }
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
      currency: CART_MONEY_BASE_CURRENCY,
    },
    itemsCount,
  };
}

function hasCompleteSnapshot(item: GuestCartItem): item is GuestCartItem & {
  snapshot: GuestCartItemSnapshot;
  productSlug: string;
} {
  return (
    typeof item.productSlug === "string" &&
    item.productSlug.length > 0 &&
    typeof item.snapshot?.title === "string" &&
    item.snapshot.title.length > 0 &&
    typeof item.snapshot.price === "number"
  );
}

function mapStoredItemToHydrated(item: GuestCartItem, index: number): GuestCartHydratedItem {
  const snapshot = item.snapshot!;
  return {
    id: `${item.productId}-${item.variantId}-${index}`,
    variant: {
      id: item.variantId,
      sku: snapshot.sku ?? "",
      stock: snapshot.stock,
      product: {
        id: item.productId,
        title: snapshot.title,
        slug: item.productSlug!,
        image: snapshot.image ?? null,
      },
    },
    quantity: item.quantity,
    price: snapshot.price,
    originalPrice: snapshot.originalPrice ?? null,
    total: snapshot.price * item.quantity,
  };
}

/** Instant guest cart from localStorage snapshots (no network). */
export function buildGuestCartFromStoredSnapshots(): GuestCartHydrated | null {
  if (typeof window === "undefined") {
    return null;
  }

  const guestItems = readGuestCart();
  if (guestItems.length === 0) {
    return null;
  }

  if (!guestItems.every(hasCompleteSnapshot)) {
    return null;
  }

  return buildGuestCart(guestItems.map(mapStoredItemToHydrated));
}

function snapshotFromHydrateLine(line: GuestCartHydrateLine): GuestCartItemSnapshot {
  return {
    title: line.title,
    image: line.image,
    price: line.price,
    originalPrice: line.originalPrice,
    sku: line.sku,
    stock: line.stock,
  };
}

function mapHydrateLineToCartItem(
  guestItem: GuestCartItem,
  line: GuestCartHydrateLine,
  index: number,
): GuestCartHydratedItem {
  return {
    id: `${guestItem.productId}-${guestItem.variantId}-${index}`,
    variant: {
      id: line.variantId,
      sku: line.sku,
      stock: line.stock,
      product: {
        id: line.productId,
        title: line.title,
        slug: line.productSlug,
        image: line.image,
      },
    },
    quantity: guestItem.quantity,
    price: line.price,
    originalPrice: line.originalPrice,
    total: line.price * guestItem.quantity,
  };
}

async function fetchGuestCartHydratedBatch(
  guestItems: GuestCartItem[],
  t: (key: string) => string,
): Promise<{ items: GuestCartHydratedItem[]; indexesToRemove: number[] }> {
  const requestItems = guestItems
    .filter((item) => item.productSlug && item.productSlug.trim().length > 0)
    .map((item) => ({
      productSlug: item.productSlug!.trim(),
      variantId: item.variantId,
      quantity: item.quantity,
    }));

  if (requestItems.length === 0) {
    return { items: [], indexesToRemove: guestItems.map((_, index) => index) };
  }

  const lang = getStoredLanguage();
  const response = await apiClient.post<{ lines: GuestCartHydrateLine[]; missingSlugs: string[] }>(
    "/api/v1/cart/guest/hydrate",
    { items: requestItems, lang },
  );

  const lineByVariantId = new Map(response.lines.map((line) => [line.variantId, line]));
  const hydratedItems: GuestCartHydratedItem[] = [];
  const indexesToRemove: number[] = [];
  const persistedItems: GuestCartItem[] = [];

  for (let index = 0; index < guestItems.length; index += 1) {
    const guestItem = guestItems[index];
    const line = lineByVariantId.get(guestItem.variantId);
    if (!line) {
      indexesToRemove.push(index);
      continue;
    }

    persistedItems.push({
      ...guestItem,
      productSlug: line.productSlug,
      snapshot: snapshotFromHydrateLine(line),
    });
    hydratedItems.push(mapHydrateLineToCartItem(guestItem, line, index));
  }

  if (indexesToRemove.length > 0 || persistedItems.length > 0) {
    localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(persistedItems));
  }

  if (hydratedItems.length === 0) {
    logger.warn("Guest cart hydrate returned no valid lines", {
      missingSlugs: response.missingSlugs,
      fallbackTitle: t("common.messages.product"),
    });
  }

  return { items: hydratedItems, indexesToRemove };
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

  const { items: validItems } = await fetchGuestCartHydratedBatch(guestItems, t);

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
