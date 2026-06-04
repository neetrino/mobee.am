import { cacheService } from "@/lib/services/cache.service";
import { productsService } from "@/lib/services/products.service";
import {
  buildProductFiltersCacheKey,
  type ProductFiltersCacheInput,
} from "@/lib/shop/product-filters-cache-key";

export type { ProductFiltersCacheInput };
export { buildProductFiltersCacheKey };

const FILTERS_CACHE_TTL_SECONDS = 120;

export type ProductFiltersPayload = Awaited<ReturnType<typeof productsService.getFilters>>;

/**
 * Redis / in-memory cached facet payload for shop filters API.
 */
export async function getCachedProductFilters(
  filters: ProductFiltersCacheInput,
): Promise<{ result: ProductFiltersPayload; cacheStatus: "HIT" | "MISS" }> {
  const cacheKey = buildProductFiltersCacheKey(filters);
  const cached = await cacheService.get(cacheKey);
  if (cached !== null && cached !== undefined) {
    const data =
      typeof cached === "string"
        ? (JSON.parse(cached) as ProductFiltersPayload)
        : (cached as ProductFiltersPayload);
    return { result: data, cacheStatus: "HIT" };
  }

  const result = await productsService.getFilters(filters);
  await cacheService.setex(cacheKey, FILTERS_CACHE_TTL_SECONDS, JSON.stringify(result));
  return { result, cacheStatus: "MISS" };
}
