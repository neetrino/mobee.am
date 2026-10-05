import { cacheService } from "@/lib/services/cache.service";
import {
  ADMIN_CONTENT_LOCALES,
  type AdminContentLocale,
} from "@/lib/admin/admin-content-locale";

/** Server-side TTL for stable admin reference GET responses (seconds). */
const ADMIN_REFERENCE_SERVER_CACHE_TTL_SECONDS = 120;

const CACHE_KEY_PREFIX = "admin:ref:";

export type AdminReferenceServerCacheKey =
  | "categories"
  | "brands"
  | "settings"
  | "delivery"
  | "price-filter-settings"
  | "home-hero";

function buildCacheKey(
  key: AdminReferenceServerCacheKey,
  locale?: AdminContentLocale,
): string {
  if (locale && (key === "categories" || key === "brands")) {
    return `${CACHE_KEY_PREFIX}${key}:${locale}`;
  }
  return `${CACHE_KEY_PREFIX}${key}`;
}

function deserializeCachedValue<T>(cached: unknown): T {
  if (typeof cached === "string") {
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
  locale?: AdminContentLocale,
): Promise<T> {
  const cacheKey = buildCacheKey(key, locale);
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
 * For locale-scoped keys (brands/categories), clears all locales.
 */
export async function invalidateAdminReferenceServerCache(
  key: AdminReferenceServerCacheKey,
): Promise<void> {
  if (key === "categories" || key === "brands") {
    await Promise.all(
      ADMIN_CONTENT_LOCALES.map((locale) =>
        cacheService.del(buildCacheKey(key, locale)),
      ),
    );
    // Legacy unscoped key (pre-locale cache).
    await cacheService.del(`${CACHE_KEY_PREFIX}${key}`);
    return;
  }

  await cacheService.del(buildCacheKey(key));
}
