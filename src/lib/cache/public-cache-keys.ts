/** Long-lived storefront Redis TTL. Freshness comes from write-time invalidation. */
export const STOREFRONT_CACHE_TTL_SEC = 86_400;

export const PRODUCTS_PLP_CACHE_TTL_SEC = STOREFRONT_CACHE_TTL_SEC;
export const PRODUCTS_PDP_CACHE_TTL_SEC = STOREFRONT_CACHE_TTL_SEC;
export const PRODUCTS_FILTERS_CACHE_TTL_SEC = STOREFRONT_CACHE_TTL_SEC;
export const CATEGORIES_CACHE_TTL_SEC = STOREFRONT_CACHE_TTL_SEC;
export const HOME_HERO_CACHE_TTL_SEC = STOREFRONT_CACHE_TTL_SEC;
export const DISCOUNT_CONTEXT_CACHE_TTL_SEC = STOREFRONT_CACHE_TTL_SEC;

export const PRODUCTS_PLP_CACHE_PATTERN = "cache:products:plp:*";
export const PRODUCTS_FILTERS_CACHE_PATTERN = "cache:products:filters:*";
export const PRODUCTS_PDP_CACHE_PATTERN = "cache:products:pdp:*";
export const PRODUCTS_DETAIL_CACHE_PATTERN = "cache:products:detail:*";
export const CATEGORIES_CACHE_PATTERN = "cache:categories:*";
export const HOME_HERO_CACHE_KEY = "cache:home:hero:v1";
export const HOME_HERO_CACHE_PATTERN = "cache:home:hero:*";

/** Legacy prefixes from short-TTL caches — still deleted on invalidation. */
export const LEGACY_PRODUCTS_CACHE_PATTERN = "products:*";
export const LEGACY_CATEGORIES_CACHE_PATTERN = "categories:*";
