import type { ProductFilters } from "@/lib/services/products-find-query/types";
import {
  CATALOG_DEFAULT_LIMIT,
  CATALOG_DEFAULT_PAGE,
  CATALOG_LIST_CACHE_PREFIX,
} from "@/lib/catalog/catalog.constants";

import { PRODUCTS_PLP_CACHE_TTL_SEC } from "@/lib/cache/public-cache-keys";

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

  if (filters.brand) {
    pairs.push(["brand", normalizeCommaListCacheValue(filters.brand)]);
  }
  if (filters.category) {
    pairs.push(["category", normalizeCommaListCacheValue(filters.category)]);
  }
  if (filters.colors) {
    pairs.push(["colors", normalizeCommaListCacheValue(filters.colors)]);
  }
  if (filters.filter) pairs.push(["filter", filters.filter]);
  if (filters.ids?.length) {
    pairs.push(["ids", [...filters.ids].sort().join(",")]);
  }
  pairs.push(["lang", filters.lang || "en"]);
  pairs.push(["limit", String(filters.limit ?? CATALOG_DEFAULT_LIMIT)]);
  if (filters.maxPrice != null && !Number.isNaN(filters.maxPrice)) {
    pairs.push(["maxPrice", String(filters.maxPrice)]);
  }
  if (filters.minPrice != null && !Number.isNaN(filters.minPrice)) {
    pairs.push(["minPrice", String(filters.minPrice)]);
  }
  pairs.push(["page", String(filters.page ?? CATALOG_DEFAULT_PAGE)]);
  if (filters.search) pairs.push(["search", filters.search]);
  if (filters.sizes) {
    pairs.push(["sizes", normalizeCommaListCacheValue(filters.sizes)]);
  }
  if (filters.sort && filters.sort !== "default") {
    pairs.push(["sort", filters.sort]);
  }

  pairs.sort(([a], [b]) => a.localeCompare(b));
  const qs = pairs
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  return `${CATALOG_LIST_CACHE_PREFIX}:${qs}`;
}

/**
 * Storefront list TTL. Featured rails share the same long TTL; writes invalidate.
 */
export function productListCacheTtlSeconds(_filters: ProductFilters): number {
  return PRODUCTS_PLP_CACHE_TTL_SEC;
}
