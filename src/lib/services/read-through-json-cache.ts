import { cacheService } from "@/lib/services/cache.service";
import { logger } from "@/lib/utils/logger";
import {
  CATEGORIES_CACHE_PATTERN,
  HOME_HERO_CACHE_PATTERN,
  LEGACY_CATEGORIES_CACHE_PATTERN,
  LEGACY_PRODUCTS_CACHE_PATTERN,
  PRODUCTS_DETAIL_CACHE_PATTERN,
  PRODUCTS_FILTERS_CACHE_PATTERN,
  PRODUCTS_PDP_CACHE_PATTERN,
  PRODUCTS_PLP_CACHE_PATTERN,
} from "@/lib/cache/public-cache-keys";
import { CATALOG_DISCOUNT_CACHE_KEY } from "@/lib/catalog/catalog.constants";

const inflightByKey = new Map<string, Promise<unknown>>();

export type CachedJsonResult<T> = {
  result: T;
  cacheStatus: "HIT" | "MISS";
};

function toJsonText(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string") {
    return value.length > 0 ? value : null;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function parseJson<T>(raw: unknown): T | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  if (typeof raw === "object") {
    return raw as T;
  }
  const text = toJsonText(raw);
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/**
 * Read-through JSON cache. Fail-open to the fetcher on Redis errors.
 * Concurrent misses for the same key share one fetcher (single-flight).
 */
export async function getCachedJson<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
  options?: { requireSharedCache?: boolean },
): Promise<CachedJsonResult<T>> {
  if (options?.requireSharedCache) {
    const backend = await cacheService.getBackend();
    if (backend === "memory" && process.env.NODE_ENV === "production") {
      const result = await fetcher();
      return { result, cacheStatus: "MISS" };
    }
  }

  try {
    const hit = parseJson<T>(await cacheService.get(key));
    if (hit !== null) {
      return { result: hit, cacheStatus: "HIT" };
    }
  } catch (error: unknown) {
    logger.warn("Cache read failed; falling back to fetcher", {
      key,
      error: error instanceof Error ? error.message : String(error),
    });
    const result = await fetcher();
    return { result, cacheStatus: "MISS" };
  }

  if (!inflightByKey.has(key)) {
    inflightByKey.set(
      key,
      (async () => {
        try {
          const second = parseJson<T>(await cacheService.get(key));
          if (second !== null) {
            return second;
          }
          const fresh = await fetcher();
          try {
            await cacheService.setex(key, ttlSeconds, JSON.stringify(fresh));
          } catch (error: unknown) {
            logger.warn("Cache write failed", {
              key,
              error: error instanceof Error ? error.message : String(error),
            });
          }
          return fresh;
        } finally {
          inflightByKey.delete(key);
        }
      })(),
    );
  }

  const result = (await inflightByKey.get(key)) as T;
  return { result, cacheStatus: "MISS" };
}

export async function invalidateProductsPlpCache(): Promise<void> {
  await cacheService.deletePattern(PRODUCTS_PLP_CACHE_PATTERN);
  await cacheService.deletePattern(PRODUCTS_FILTERS_CACHE_PATTERN);
}

export async function invalidateProductPdpCache(): Promise<void> {
  await cacheService.deletePattern(PRODUCTS_PDP_CACHE_PATTERN);
  await cacheService.deletePattern(PRODUCTS_DETAIL_CACHE_PATTERN);
}

export async function invalidateCategoryCaches(): Promise<void> {
  await cacheService.deletePattern(CATEGORIES_CACHE_PATTERN);
  await cacheService.deletePattern(LEGACY_CATEGORIES_CACHE_PATTERN);
}

export async function invalidateHomeHeroCache(): Promise<void> {
  await cacheService.deletePattern(HOME_HERO_CACHE_PATTERN);
}

export async function invalidateProductReadCaches(): Promise<void> {
  await invalidateProductsPlpCache();
  await invalidateProductPdpCache();
  await cacheService.deletePattern(LEGACY_PRODUCTS_CACHE_PATTERN);
  await cacheService.del(CATALOG_DISCOUNT_CACHE_KEY);
}

export async function invalidateCatalogReadCaches(): Promise<void> {
  await invalidateProductReadCaches();
  await invalidateCategoryCaches();
  await invalidateHomeHeroCache();
}
