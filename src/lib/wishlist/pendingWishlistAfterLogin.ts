import { WISHLIST_KEY } from '../storageCounts';

/** Session-only: product user tried to favorite before completing login (same tab). */
export const PENDING_WISHLIST_PRODUCT_ID_SESSION_KEY = 'mobee_pending_wishlist_product_id';

const MAX_PRODUCT_ID_LEN = 128;

function isValidPendingProductId(id: string): boolean {
  const t = id.trim();
  return t.length > 0 && t.length <= MAX_PRODUCT_ID_LEN;
}

/**
 * Remember one product to add to `shop_wishlist` after successful login/register.
 */
export function queueWishlistProductForAfterLogin(productId: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = productId.trim();
  if (!isValidPendingProductId(trimmed)) return;
  try {
    sessionStorage.setItem(PENDING_WISHLIST_PRODUCT_ID_SESSION_KEY, trimmed);
  } catch {
    // Private mode / quota
  }
}

/**
 * Merges queued product id into localStorage wishlist and notifies listeners.
 * Call once after persisting auth (login/register).
 */
export function applyPendingWishlistProductAfterAuth(): void {
  if (typeof window === 'undefined') return;
  try {
    const id = sessionStorage.getItem(PENDING_WISHLIST_PRODUCT_ID_SESSION_KEY);
    if (!id || !isValidPendingProductId(id)) {
      return;
    }
    sessionStorage.removeItem(PENDING_WISHLIST_PRODUCT_ID_SESSION_KEY);

    const stored = localStorage.getItem(WISHLIST_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : [];
    const wishlist = Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === 'string')
      : [];

    if (!wishlist.includes(id.trim())) {
      wishlist.push(id.trim());
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
    }
    window.dispatchEvent(new Event('wishlist-updated'));
  } catch {
    try {
      sessionStorage.removeItem(PENDING_WISHLIST_PRODUCT_ID_SESSION_KEY);
    } catch {
      void 0;
    }
  }
}
