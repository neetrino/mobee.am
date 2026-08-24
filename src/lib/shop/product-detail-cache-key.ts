const PRODUCT_DETAIL_CACHE_PREFIX = "products:detail:v1";

/** Stable Redis/memory key for full product detail by slug (lang only — prices converted client-side). */
export function buildProductDetailCacheKey(slug: string, lang: string): string {
  const normalizedSlug = slug.trim();
  const normalizedLang = (lang || "en").trim().toLowerCase();
  return `${PRODUCT_DETAIL_CACHE_PREFIX}:${normalizedSlug}:${normalizedLang}`;
}

export const PRODUCT_DETAIL_CACHE_TTL_SECONDS = 120;
