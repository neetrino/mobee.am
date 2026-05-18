import {
  isProductInWishlist,
  readWishlistProductIds,
  writeWishlistProductIds,
} from './wishlist-storage';

/** Session-only: product user tried to favorite before completing login (same tab). */
export const PENDING_WISHLIST_PRODUCT_ID_SESSION_KEY = 'mobee_pending_wishlist_product_id';

const PENDING_WISHLIST_AT_SESSION_KEY = 'mobee_pending_wishlist_product_id_at';

/** Pending favorite expires after 30 minutes so stale session data cannot inflate the badge on login. */
const PENDING_WISHLIST_TTL_MS = 30 * 60 * 1000;

const MAX_PRODUCT_ID_LEN = 128;

function isValidPendingProductId(id: string): boolean {
  const trimmed = id.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_PRODUCT_ID_LEN;
}

function clearPendingWishlistSession(): void {
  try {
    sessionStorage.removeItem(PENDING_WISHLIST_PRODUCT_ID_SESSION_KEY);
    sessionStorage.removeItem(PENDING_WISHLIST_AT_SESSION_KEY);
  } catch {
    void 0;
  }
}

function isPendingWishlistExpired(queuedAtMs: number): boolean {
  if (!Number.isFinite(queuedAtMs)) {
    return true;
  }
  return Date.now() - queuedAtMs > PENDING_WISHLIST_TTL_MS;
}

/**
 * Remember one product to add to `shop_wishlist` after successful login/register.
 */
export function queueWishlistProductForAfterLogin(productId: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  const trimmed = productId.trim();
  if (!isValidPendingProductId(trimmed)) {
    return;
  }
  try {
    sessionStorage.setItem(PENDING_WISHLIST_PRODUCT_ID_SESSION_KEY, trimmed);
    sessionStorage.setItem(PENDING_WISHLIST_AT_SESSION_KEY, String(Date.now()));
  } catch {
    // Private mode / quota
  }
}

/**
 * Merges queued product id into localStorage wishlist and notifies listeners.
 * Call once after persisting auth (login/register).
 */
export function applyPendingWishlistProductAfterAuth(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const id = sessionStorage.getItem(PENDING_WISHLIST_PRODUCT_ID_SESSION_KEY);
    const queuedAtRaw = sessionStorage.getItem(PENDING_WISHLIST_AT_SESSION_KEY);
    clearPendingWishlistSession();

    if (!id || !isValidPendingProductId(id)) {
      return;
    }

    const queuedAtMs = queuedAtRaw ? Number(queuedAtRaw) : NaN;
    if (isPendingWishlistExpired(queuedAtMs)) {
      return;
    }

    const trimmed = id.trim();
    if (isProductInWishlist(trimmed)) {
      return;
    }

    writeWishlistProductIds([...readWishlistProductIds(), trimmed]);
  } catch {
    clearPendingWishlistSession();
  }
}
