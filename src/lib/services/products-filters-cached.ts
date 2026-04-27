import { cacheService } from "@/lib/services/cache.service";
import { productsService } from "@/lib/services/products.service";

const FILTERS_CACHE_TTL_SECONDS = 120;

export type ProductFiltersPayload = Awaited<ReturnType<typeof productsService.getFilters>>;

export type ProductFiltersCacheInput = {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  lang?: string;
};

/**
 * Stable cache key for facet filters (shared by GET /api/v1/products/filters).
 */
export function buildProductFiltersCacheKey(filters: ProductFiltersCacheInput): string {
  const pairs: [string, string][] = [];
  pairs.push(["lang", filters.lang || "en"]);
  if (filters.category) pairs.push(["category", filters.category]);
  if (filters.search) pairs.push(["search", filters.search]);
  if (filters.minPrice != null && !Number.isNaN(filters.minPrice)) {
    pairs.push(["minPrice", String(filters.minPrice)]);
  }
  if (filters.maxPrice != null && !Number.isNaN(filters.maxPrice)) {
    pairs.push(["maxPrice", String(filters.maxPrice)]);
  }
  pairs.sort(([a], [b]) => a.localeCompare(b));
  const qs = pairs
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  return `products:filters:${qs}`;
}

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
