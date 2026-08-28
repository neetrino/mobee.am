import { PRODUCTS_PDP_CACHE_TTL_SEC } from "@/lib/cache/public-cache-keys";

const PRODUCT_DETAIL_CACHE_PREFIX = "cache:products:pdp:v1";

/** Stable Redis/memory key for full product detail by slug (lang only — prices converted client-side). */
export function buildProductDetailCacheKey(slug: string, lang: string): string {
  const normalizedSlug = slug.trim();
  const normalizedLang = (lang || "en").trim().toLowerCase();
  return `${PRODUCT_DETAIL_CACHE_PREFIX}:${normalizedSlug}:${normalizedLang}`;
}

export const PRODUCT_DETAIL_CACHE_TTL_SECONDS = PRODUCTS_PDP_CACHE_TTL_SEC;

/** PDP JSON must not be stored at the CDN. Variants are live from the database. */
export const PRODUCT_DETAIL_HTTP_CACHE_CONTROL =
  "private, no-store, no-cache, must-revalidate";
