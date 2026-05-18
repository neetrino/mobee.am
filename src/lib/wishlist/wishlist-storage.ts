/** Must match `STORAGE_KEYS.wishlist` in `storageCounts.ts`. */
export const WISHLIST_STORAGE_KEY = 'shop_wishlist';

const MAX_WISHLIST_ITEMS = 200;
const MAX_PRODUCT_ID_LEN = 128;

function isValidProductId(id: string): boolean {
  const trimmed = id.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_PRODUCT_ID_LEN;
}

/**
 * Normalizes raw localStorage JSON into a deduplicated list of product ids.
 */
function normalizeWishlistIds(parsed: unknown): string[] {
  if (!Array.isArray(parsed)) {
    return [];
  }

  const seen = new Set<string>();
  const ids: string[] = [];

  for (const entry of parsed) {
    if (typeof entry !== 'string' || !isValidProductId(entry)) {
      continue;
    }
    const trimmed = entry.trim();
    if (seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    ids.push(trimmed);
    if (ids.length >= MAX_WISHLIST_ITEMS) {
      break;
    }
  }

  return ids;
}

/**
 * Reads wishlist product ids from localStorage (invalid entries are dropped).
 */
export function readWishlistProductIds(): string[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (!stored) {
      return [];
    }
    const parsed: unknown = JSON.parse(stored);
    const normalized = normalizeWishlistIds(parsed);

    if (Array.isArray(parsed) && JSON.stringify(parsed) !== JSON.stringify(normalized)) {
      window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(normalized));
    }

    return normalized;
  } catch {
    return [];
  }
}

/**
 * Persists wishlist ids and notifies listeners when the list changes.
 */
export function writeWishlistProductIds(ids: string[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  const normalized = normalizeWishlistIds(ids);
  const previous = readWishlistProductIds();
  const changed = JSON.stringify(previous) !== JSON.stringify(normalized);

  window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(normalized));

  if (changed) {
    window.dispatchEvent(new Event('wishlist-updated'));
  }
}

/**
 * Keeps only ids that exist in the provided catalog set; updates storage when needed.
 */
export function pruneWishlistToCatalogIds(catalogIds: ReadonlySet<string>): string[] {
  const current = readWishlistProductIds();
  const pruned = current.filter((id) => catalogIds.has(id));

  if (pruned.length !== current.length) {
    writeWishlistProductIds(pruned);
  }

  return pruned;
}

export function isProductInWishlist(productId: string): boolean {
  if (!isValidProductId(productId)) {
    return false;
  }
  return readWishlistProductIds().includes(productId.trim());
}

export function toggleWishlistProductId(productId: string): boolean {
  const trimmed = productId.trim();
  if (!isValidProductId(trimmed)) {
    return false;
  }

  const current = readWishlistProductIds();
  const isListed = current.includes(trimmed);

  if (isListed) {
    writeWishlistProductIds(current.filter((id) => id !== trimmed));
    return false;
  }

  writeWishlistProductIds([...current, trimmed]);
  return true;
}
