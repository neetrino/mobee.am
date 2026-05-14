import type { ProductFilters } from "@/lib/services/products-find-query/types";

const PRODUCTS_CACHE_TTL = 120;
const FEATURED_CACHE_TTL = 600;
const PRODUCT_LIST_CACHE_PREFIX = "products:v2";

/** Stable ordering for comma-separated URL params in cache keys (e.g. `category=a,b` vs `b,a`). */
export function normalizeCommaListCacheValue(raw: string): string {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .sort()
    .join(",");
}

/**
 * Stable cache key from normalized filters so RSC (/shop), GET /api/v1/products, and the client share the same key shape.
 */
export function buildProductListCacheKey(filters: ProductFilters): string {
  const pairs: [string, string][] = [];

  if (filters.brand) pairs.push(["brand", filters.brand]);
  if (filters.category) {
    pairs.push(["category", normalizeCommaListCacheValue(filters.category)]);
  }
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
  return `${PRODUCT_LIST_CACHE_PREFIX}:${qs}`;
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
