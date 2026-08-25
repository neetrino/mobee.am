import { cacheService } from "@/lib/services/cache.service";
import { productsService } from "@/lib/services/products.service";
import { logger } from "@/lib/utils/logger";
import {
  buildProductFiltersCacheKey,
  type ProductFiltersCacheInput,
} from "@/lib/shop/product-filters-cache-key";

export type { ProductFiltersCacheInput };
export { buildProductFiltersCacheKey };

const FILTERS_CACHE_TTL_SECONDS = 120;

export type ProductFiltersPayload = Awaited<ReturnType<typeof productsService.getFilters>>;

function parseFiltersPayload(cached: string | unknown): ProductFiltersPayload | null {
  try {
    const data = typeof cached === "string" ? JSON.parse(cached) : cached;
    if (!data || typeof data !== "object") {
      return null;
    }
    return data as ProductFiltersPayload;
  } catch {
    return null;
  }
}

/**
 * Redis cached facet payload. Cache failures fail-open to DB.
 */
export async function getCachedProductFilters(
  filters: ProductFiltersCacheInput,
): Promise<{ result: ProductFiltersPayload; cacheStatus: "HIT" | "MISS" }> {
  const cacheKey = buildProductFiltersCacheKey(filters);
  let cached: ProductFiltersPayload | null = null;
  try {
    cached = parseFiltersPayload(await cacheService.get(cacheKey));
  } catch (error: unknown) {
    logger.warn("Catalog filters cache read failed; falling back to database", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
  if (cached) {
    return { result: cached, cacheStatus: "HIT" };
  }

  const result = await productsService.getFilters(filters);
  try {
    await cacheService.setex(cacheKey, FILTERS_CACHE_TTL_SECONDS, JSON.stringify(result));
  } catch (error: unknown) {
    logger.warn("Catalog filters cache write failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
  return { result, cacheStatus: "MISS" };
}
