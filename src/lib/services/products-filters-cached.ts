import { productsService } from "@/lib/services/products.service";
import { cacheService } from "@/lib/services/cache.service";
import { getCachedJson } from "@/lib/services/read-through-json-cache";
import { PRODUCTS_FILTERS_CACHE_TTL_SEC } from "@/lib/cache/public-cache-keys";
import {
  buildProductFiltersCacheKey,
  type ProductFiltersCacheInput,
} from "@/lib/shop/product-filters-cache-key";

export type { ProductFiltersCacheInput };
export { buildProductFiltersCacheKey };

export type ProductFiltersPayload = Awaited<ReturnType<typeof productsService.getFilters>>;

function isCompleteFiltersPayload(value: ProductFiltersPayload): boolean {
  return Array.isArray(value.attributes);
}

/**
 * Redis cached facet payload. Cache failures fail-open to DB.
 * Rejects pre-attributes cache entries so storage/sim/… facets rebuild.
 */
export async function getCachedProductFilters(
  filters: ProductFiltersCacheInput,
): Promise<{ result: ProductFiltersPayload; cacheStatus: "HIT" | "MISS" }> {
  const cacheKey = buildProductFiltersCacheKey(filters);
  const cached = await getCachedJson<ProductFiltersPayload>(
    cacheKey,
    PRODUCTS_FILTERS_CACHE_TTL_SEC,
    () => productsService.getFilters(filters),
  );
  if (cached.cacheStatus === "HIT" && !isCompleteFiltersPayload(cached.result)) {
    const result = await productsService.getFilters(filters);
    try {
      await cacheService.setex(
        cacheKey,
        PRODUCTS_FILTERS_CACHE_TTL_SEC,
        JSON.stringify(result),
      );
    } catch {
      // fail-open — still return fresh facets
    }
    return { result, cacheStatus: "MISS" };
  }
  return cached;
}
