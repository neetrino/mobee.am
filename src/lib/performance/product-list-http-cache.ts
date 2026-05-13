import type { ProductFilters } from "@/lib/services/products-find-query/types";
import { productListCacheTtlSeconds } from "@/lib/shop/product-list-cache-key";

/** Lower bound for stale-while-revalidate (seconds). */
const PRODUCT_LIST_SWR_MIN_SECONDS = 60;

/** Upper cap so clients do not serve very stale listings (seconds). */
const PRODUCT_LIST_SWR_MAX_SECONDS = 600;

/**
 * HTTP cache for GET /api/v1/products — aligns with Redis TTL, enables CDN + browser SWR.
 * `max-age=0`: revalidate with server; `s-maxage`: shared caches; `stale-while-revalidate`: serve stale while refreshing.
 */
export function buildProductListCacheControlHeader(filters: ProductFilters): string {
  const originTtl = productListCacheTtlSeconds(filters);
  const sMaxAge = Math.min(originTtl, 120);
  const swr = Math.min(
    Math.max(originTtl * 2, PRODUCT_LIST_SWR_MIN_SECONDS),
    PRODUCT_LIST_SWR_MAX_SECONDS,
  );
  return `public, max-age=0, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`;
}
