/** Default catalog page (1-based). */
export const CATALOG_DEFAULT_PAGE = 1;

/** Default page size for GET /api/v1/products and /shop. */
export const CATALOG_DEFAULT_LIMIT = 12;

/** Maximum page size accepted at the public API boundary (not a result-window cap). */
export const CATALOG_MAX_PAGE_SIZE = 200;

/** Maximum product ids for compare / batch lookup. */
export const CATALOG_MAX_IDS = 20;

/** Maximum distinct category slugs in `category=a,b`. */
export const CATALOG_MAX_CATEGORY_SLUGS = 15;

/** Maximum brand tokens from `brand=`. */
export const CATALOG_MAX_BRAND_TOKENS = 40;

/** Discount settings cache key (list price + facets). */
export const CATALOG_DISCOUNT_CACHE_KEY = "product-list:discount-context";

/** Maximum color tokens from `colors=`. */
export const CATALOG_MAX_COLOR_TOKENS = 40;

/** Maximum size tokens from `sizes=`. */
export const CATALOG_MAX_SIZE_TOKENS = 40;

/** Maximum distinct attribute keys from `attrs=`. */
export const CATALOG_MAX_ATTR_KEYS = 20;

/** Maximum values kept per attribute key in `attrs=`. */
export const CATALOG_MAX_ATTR_VALUES_PER_KEY = 40;

/** Maximum characters kept from `search=` after trim. */
export const CATALOG_MAX_SEARCH_CHARS = 200;

/** Minimum product rows on one shop page (desktop grid). */
export const SHOP_MIN_PRODUCT_ROWS = 4;

/** Desktop shop grid columns used for page-size = rows × columns. */
export const SHOP_DESKTOP_GRID_COLUMNS = 3;

/** `filter=new` window in days. */
export const CATALOG_NEW_ARRIVAL_DAYS = 30;

export const CATALOG_ATTRIBUTE_COLOR = "color";
export const CATALOG_ATTRIBUTE_SIZE = "size";

export const CATALOG_EMPTY_TOKENS = ["undefined", "null"] as const;

export const CATALOG_KNOWN_FILTERS = ["new", "featured", "bestseller"] as const;

export const CATALOG_SIZE_ORDER = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "XXXL",
] as const;

export const CATALOG_LIST_CACHE_PREFIX = "cache:products:plp:v1";
/** v2: facet payload includes generic `attributes` (storage/sim/…). */
export const CATALOG_FILTERS_CACHE_PREFIX = "cache:products:filters:v2";
