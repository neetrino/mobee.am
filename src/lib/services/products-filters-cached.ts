import { productsService } from "@/lib/services/products.service";
import { getCachedJson } from "@/lib/services/read-through-json-cache";
import { PRODUCTS_FILTERS_CACHE_TTL_SEC } from "@/lib/cache/public-cache-keys";
import {
  buildProductFiltersCacheKey,
  type ProductFiltersCacheInput,
} from "@/lib/shop/product-filters-cache-key";

export type { ProductFiltersCacheInput };
export { buildProductFiltersCacheKey };

export type ProductFiltersPayload = Awaited<ReturnType<typeof productsService.getFilters>>;

/**
 * Redis cached facet payload. Cache failures fail-open to DB.
 */
export async function getCachedProductFilters(
  filters: ProductFiltersCacheInput,
): Promise<{ result: ProductFiltersPayload; cacheStatus: "HIT" | "MISS" }> {
  const cacheKey = buildProductFiltersCacheKey(filters);
  return getCachedJson<ProductFiltersPayload>(
    cacheKey,
    PRODUCTS_FILTERS_CACHE_TTL_SEC,
    () => productsService.getFilters(filters),
  );
}
