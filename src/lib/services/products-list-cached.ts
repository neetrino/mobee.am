import type { ProductFilters } from "@/lib/services/products-find-query/types";
import { cacheService } from "@/lib/services/cache.service";
import { productsService } from "@/lib/services/products.service";

const PRODUCTS_CACHE_TTL = 120;
const FEATURED_CACHE_TTL = 600;

export type ProductListPayload = Awaited<ReturnType<typeof productsService.findAll>>;

/**
 * Stable cache key from normalized filters so RSC (/shop) and GET /api/v1/products share entries.
 */
export function buildProductListCacheKey(filters: ProductFilters): string {
  const pairs: [string, string][] = [];

  if (filters.brand) pairs.push(["brand", filters.brand]);
  if (filters.category) pairs.push(["category", filters.category]);
  if (filters.colors) pairs.push(["colors", filters.colors]);
  if (filters.filter) pairs.push(["filter", filters.filter]);
  if (filters.ids?.length) {
    pairs.push(["ids", [...filters.ids].sort().join(",")]);
  }
  pairs.push(["lang", filters.lang || "en"]);
  pairs.push(["limit", String(filters.limit ?? 12)]);
  if (filters.maxPrice != null && !Number.isNaN(filters.maxPrice)) {
    pairs.push(["maxPrice", String(filters.maxPrice)]);
  }
  if (filters.minPrice != null && !Number.isNaN(filters.minPrice)) {
    pairs.push(["minPrice", String(filters.minPrice)]);
  }
  pairs.push(["page", String(filters.page ?? 1)]);
  if (filters.search) pairs.push(["search", filters.search]);
  if (filters.sizes) pairs.push(["sizes", filters.sizes]);
  if (filters.sort && filters.sort !== "default") {
    pairs.push(["sort", filters.sort]);
  }

  pairs.sort(([a], [b]) => a.localeCompare(b));
  const qs = pairs
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  return `products:${qs}`;
}

export function productListCacheTtlSeconds(filters: ProductFilters): number {
  const filterVal = filters.filter;
  const onlyFeatured =
    typeof filterVal === "string" &&
    ["new", "bestseller", "featured"].includes(filterVal) &&
    !filters.category &&
    !filters.search &&
    (filters.limit ?? 12) <= 24;
  return onlyFeatured ? FEATURED_CACHE_TTL : PRODUCTS_CACHE_TTL;
}

/**
 * Redis / in-memory cached product list — use from the HTTP route and from RSC (/shop).
 */
export async function getCachedProductList(
  filters: ProductFilters,
): Promise<{ result: ProductListPayload; cacheStatus: "HIT" | "MISS" }> {
  const cacheKey = buildProductListCacheKey(filters);
  const cached = await cacheService.get(cacheKey);
  if (cached !== null && cached !== undefined) {
    const data =
      typeof cached === "string"
        ? (JSON.parse(cached) as ProductListPayload)
        : (cached as ProductListPayload);
    return { result: data, cacheStatus: "HIT" };
  }

  const result = await productsService.findAll(filters);
  const ttl = productListCacheTtlSeconds(filters);
  await cacheService.setex(cacheKey, ttl, JSON.stringify(result));
  return { result, cacheStatus: "MISS" };
}
