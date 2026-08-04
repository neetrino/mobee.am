/**
 * Browser in-memory cache for shop product list payloads.
 * Shared by warm-prefetch and useShopCatalog so pagination can paint instantly.
 */

import type { ProductListPayload } from '@/lib/services/products-list-cached';

const CLIENT_LIST_CACHE_TTL_MS = 120_000;

type CacheEntry = {
  payload: ProductListPayload;
  savedAt: number;
};

const cache = new Map<string, CacheEntry>();
const listeners = new Set<(cacheKey: string) => void>();

function isFresh(entry: CacheEntry): boolean {
  return Date.now() - entry.savedAt < CLIENT_LIST_CACHE_TTL_MS;
}

export function getProductListClientCache(cacheKey: string): ProductListPayload | null {
  const entry = cache.get(cacheKey);
  if (!entry || !isFresh(entry)) {
    if (entry) {
      cache.delete(cacheKey);
    }
    return null;
  }
  return entry.payload;
}

export function setProductListClientCache(
  cacheKey: string,
  payload: ProductListPayload,
): void {
  cache.set(cacheKey, { payload, savedAt: Date.now() });
  listeners.forEach((listener) => listener(cacheKey));
}

export function subscribeProductListClientCache(
  listener: (cacheKey: string) => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Test helper — clears in-memory entries. */
export function clearProductListClientCacheForTests(): void {
  cache.clear();
}
