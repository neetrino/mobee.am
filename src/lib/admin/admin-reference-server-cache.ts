import { cacheService } from "@/lib/services/cache.service";

/** Server-side TTL for stable admin reference GET responses (seconds). */
const ADMIN_REFERENCE_SERVER_CACHE_TTL_SECONDS = 120;

const CACHE_KEY_PREFIX = "admin:ref:";

export type AdminReferenceServerCacheKey =
  | "categories"
  | "brands"
  | "settings"
  | "delivery"
  | "price-filter-settings";

function buildCacheKey(key: AdminReferenceServerCacheKey): string {
  return `${CACHE_KEY_PREFIX}${key}`;
}

function deserializeCachedValue<T>(cached: unknown): T {
  if (typeof cached === 'string') {
    return JSON.parse(cached) as T;
  }
  return cached as T;
}

/**
 * Returns cached admin reference payload or loads via fetcher and stores in cache.
 */
export async function getCachedAdminReferenceResponse<T>(
  key: AdminReferenceServerCacheKey,
  fetcher: () => Promise<T>,
): Promise<T> {
  const cacheKey = buildCacheKey(key);
  const cached = await cacheService.get(cacheKey);

  if (cached !== null) {
    try {
      return deserializeCachedValue<T>(cached);
    } catch {
      await cacheService.del(cacheKey);
    }
  }

  const value = await fetcher();
  await cacheService.setex(
    cacheKey,
    ADMIN_REFERENCE_SERVER_CACHE_TTL_SECONDS,
    JSON.stringify(value),
  );
  return value;
}

/**
 * Drops server cache entry after reference data mutations.
 */
export async function invalidateAdminReferenceServerCache(
  key: AdminReferenceServerCacheKey,
): Promise<void> {
  await cacheService.del(buildCacheKey(key));
}
