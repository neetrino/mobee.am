import { dedupedAdminRequest } from '@/lib/admin/admin-request-dedup';
import type { AdminContentLocale } from '@/lib/admin/admin-content-locale';
import { ADMIN_CONTENT_LOCALES } from '@/lib/admin/admin-content-locale';

/**
 * Short-lived in-memory cache for stable admin reference GET data (client-side only).
 */

const ADMIN_REFERENCE_CACHE_TTL_MS = 45_000;

export type AdminReferenceCacheKey =
  | 'categories'
  | 'brands'
  | 'settings'
  | 'delivery'
  | 'price-filter-settings'
  | 'home-hero';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function isExpired(entry: CacheEntry<unknown>): boolean {
  return Date.now() >= entry.expiresAt;
}

function buildClientCacheKey(
  key: AdminReferenceCacheKey,
  locale?: AdminContentLocale,
): string {
  if (locale && (key === 'categories' || key === 'brands')) {
    return `${key}:${locale}`;
  }
  return key;
}

/**
 * Returns cached reference data or fetches via the supplied loader.
 */
export async function getCachedAdminReference<T>(
  key: AdminReferenceCacheKey,
  fetcher: () => Promise<T>,
  locale?: AdminContentLocale,
): Promise<T> {
  const cacheKey = buildClientCacheKey(key, locale);
  const existing = cache.get(cacheKey);
  if (existing && !isExpired(existing)) {
    return existing.value as T;
  }

  const value = await dedupedAdminRequest(`admin-ref:${cacheKey}`, fetcher);
  cache.set(cacheKey, {
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
    if (entryKey === 'categories' || entryKey === 'brands') {
      for (const locale of ADMIN_CONTENT_LOCALES) {
        cache.delete(buildClientCacheKey(entryKey, locale));
      }
      cache.delete(entryKey);
      continue;
    }
    cache.delete(entryKey);
  }
}
