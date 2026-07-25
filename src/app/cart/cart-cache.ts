import type { Cart } from './types';

const CART_PAGE_CACHE_KEY = 'cart_page_snapshot_v1';
const CART_PAGE_CACHE_TTL_MS = 10 * 60 * 1000;

interface CartPageCacheEntry {
  userId: string;
  cart: Cart;
  cachedAt: number;
}

function readCacheEntry(): CartPageCacheEntry | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(CART_PAGE_CACHE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as CartPageCacheEntry;
    if (
      !parsed ||
      typeof parsed.userId !== 'string' ||
      !parsed.cart ||
      typeof parsed.cachedAt !== 'number'
    ) {
      return null;
    }

    if (Date.now() - parsed.cachedAt > CART_PAGE_CACHE_TTL_MS) {
      sessionStorage.removeItem(CART_PAGE_CACHE_KEY);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function readLoggedInCartCache(userId: string | undefined): Cart | null {
  if (!userId) {
    return null;
  }

  const entry = readCacheEntry();
  if (!entry || entry.userId !== userId) {
    return null;
  }

  return entry.cart;
}

export function writeLoggedInCartCache(userId: string, cart: Cart): void {
  if (typeof window === 'undefined') {
    return;
  }

  const entry: CartPageCacheEntry = {
    userId,
    cart,
    cachedAt: Date.now(),
  };

  try {
    sessionStorage.setItem(CART_PAGE_CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Ignore quota or serialization errors — cache is optional.
  }
}

export function clearLoggedInCartCache(): void {
  if (typeof window === 'undefined') {
    return;
  }

  sessionStorage.removeItem(CART_PAGE_CACHE_KEY);
}

/**
 * Update the existing session cart snapshot in place (same userId).
 * Used for optimistic cart-page edits so refresh does not flash stale lines.
 */
export function patchLoggedInCartCache(cart: Cart): void {
  const entry = readCacheEntry();
  if (!entry) {
    return;
  }

  writeLoggedInCartCache(entry.userId, cart);
}
