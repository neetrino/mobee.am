/**
 * Short-lived in-memory cache for stable admin reference GET data (client-side only).
 */

const ADMIN_REFERENCE_CACHE_TTL_MS = 45_000;

export type AdminReferenceCacheKey =
  | 'categories'
  | 'brands'
  | 'settings'
  | 'delivery'
  | 'price-filter-settings';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const cache = new Map<AdminReferenceCacheKey, CacheEntry<unknown>>();

function isExpired(entry: CacheEntry<unknown>): boolean {
  return Date.now() >= entry.expiresAt;
}

/**
 * Returns cached reference data or fetches via the supplied loader.
 */
export async function getCachedAdminReference<T>(
  key: AdminReferenceCacheKey,
  fetcher: () => Promise<T>,
): Promise<T> {
  const existing = cache.get(key);
  if (existing && !isExpired(existing)) {
    return existing.value as T;
  }

  const value = await fetcher();
  cache.set(key, {
    value,
    expiresAt: Date.now() + ADMIN_REFERENCE_CACHE_TTL_MS,
  });
  return value;
}

/**
 * Drops one or all reference cache entries after mutations.
 */
export function invalidateAdminReferenceCache(
  key?: AdminReferenceCacheKey | AdminReferenceCacheKey[],
): void {
  if (!key) {
    cache.clear();
    return;
  }

  const keys = Array.isArray(key) ? key : [key];
  for (const entryKey of keys) {
    cache.delete(entryKey);
  }
}
