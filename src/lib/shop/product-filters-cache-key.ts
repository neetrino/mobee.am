import { normalizeCommaListCacheValue } from "@/lib/shop/product-list-cache-key";

export type ProductFiltersCacheInput = {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  lang?: string;
};

/**
 * Stable cache key for facet filters (shared by RSC, GET /api/v1/products/filters, and the client).
 * Kept separate from server-only cached fetch helpers so client components can import it safely.
 */
export function buildProductFiltersCacheKey(filters: ProductFiltersCacheInput): string {
  const pairs: [string, string][] = [];
  pairs.push(["lang", filters.lang || "en"]);
  if (filters.category) {
    pairs.push(["category", normalizeCommaListCacheValue(filters.category)]);
  }
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
