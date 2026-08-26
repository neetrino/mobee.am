import { normalizeCommaListCacheValue } from "@/lib/shop/product-list-cache-key";
import { CATALOG_FILTERS_CACHE_PREFIX } from "@/lib/catalog/catalog.constants";

export type ProductFiltersCacheInput = {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  lang?: string;
  brand?: string;
  colors?: string;
  sizes?: string;
  filter?: string;
};

/**
 * Stable cache key for facet filters (shared by RSC, GET /api/v1/products/filters, and the client).
 */
export function buildProductFiltersCacheKey(filters: ProductFiltersCacheInput): string {
  const pairs: [string, string][] = [];
  pairs.push(["lang", filters.lang || "en"]);
  if (filters.category) {
    pairs.push(["category", normalizeCommaListCacheValue(filters.category)]);
  }
  if (filters.search) pairs.push(["search", filters.search]);
  if (filters.brand) {
    pairs.push(["brand", normalizeCommaListCacheValue(filters.brand)]);
  }
  if (filters.colors) {
    pairs.push(["colors", normalizeCommaListCacheValue(filters.colors)]);
  }
  if (filters.sizes) {
    pairs.push(["sizes", normalizeCommaListCacheValue(filters.sizes)]);
  }
  if (filters.filter) {
    pairs.push(["filter", filters.filter]);
  }
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
  return `${CATALOG_FILTERS_CACHE_PREFIX}:${qs}`;
}
