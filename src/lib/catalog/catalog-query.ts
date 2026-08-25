import type { ProductFilters } from "@/lib/services/products-find-query/types";
import { parseProductSortOption, type ProductSortOption } from "@/lib/products/sort";
import {
  CATALOG_DEFAULT_LIMIT,
  CATALOG_DEFAULT_PAGE,
  CATALOG_KNOWN_FILTERS,
  CATALOG_MAX_BRAND_TOKENS,
  CATALOG_MAX_CATEGORY_SLUGS,
  CATALOG_MAX_COLOR_TOKENS,
  CATALOG_MAX_IDS,
  CATALOG_MAX_PAGE_SIZE,
  CATALOG_MAX_SEARCH_CHARS,
  CATALOG_MAX_SIZE_TOKENS,
} from "./catalog.constants";
import { normalizeFilterTokens } from "./filter-tokens";

export type CanonicalCatalogQuery = {
  page: number;
  limit: number;
  lang: string;
  categorySlugs: string[];
  search?: string;
  filter?: string;
  brands: string[];
  colors: string[];
  sizes: string[];
  minPrice?: number;
  maxPrice?: number;
  sort: ProductSortOption;
  ids?: string[];
};

function parsePositiveInt(raw: unknown, fallback: number): number {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    return Math.floor(raw);
  }
  if (typeof raw === "string" && raw.trim()) {
    const parsed = Number.parseInt(raw.trim(), 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return fallback;
}

function parseFiniteNumber(raw: unknown): number | undefined {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === "string" && raw.trim()) {
    const parsed = Number.parseFloat(raw.trim());
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function parseLang(raw: string | undefined): string {
  const trimmed = raw?.trim();
  return trimmed ? trimmed : "en";
}

function parseSearch(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.slice(0, CATALOG_MAX_SEARCH_CHARS);
}

function parseKnownFilter(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim().toLowerCase();
  if (!trimmed) {
    return undefined;
  }
  return CATALOG_KNOWN_FILTERS.includes(
    trimmed as (typeof CATALOG_KNOWN_FILTERS)[number],
  )
    ? trimmed
    : undefined;
}

function parseIds(ids: string[] | undefined): string[] | undefined {
  if (!ids || ids.length === 0) {
    return undefined;
  }
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  return unique.length > 0 ? unique.slice(0, CATALOG_MAX_IDS) : undefined;
}

/**
 * Strict catalog query: invalid numbers/sorts fall back to safe defaults,
 * unknown filter tokens are ignored, lists are trimmed and deduped.
 */
export function normalizeCatalogQuery(filters: ProductFilters): CanonicalCatalogQuery {
  const page = parsePositiveInt(filters.page, CATALOG_DEFAULT_PAGE);
  const unlimited = parsePositiveInt(filters.limit, CATALOG_DEFAULT_LIMIT);
  const limit = Math.min(unlimited, CATALOG_MAX_PAGE_SIZE);
  const ids = parseIds(filters.ids);

  return {
    page,
    limit: ids?.length ? Math.min(Math.max(limit, ids.length), CATALOG_MAX_PAGE_SIZE) : limit,
    lang: parseLang(filters.lang),
    categorySlugs: normalizeFilterTokens(
      filters.category,
      undefined,
      CATALOG_MAX_CATEGORY_SLUGS,
    ),
    search: parseSearch(filters.search),
    filter: parseKnownFilter(filters.filter),
    brands: normalizeFilterTokens(filters.brand, undefined, CATALOG_MAX_BRAND_TOKENS),
    colors: normalizeFilterTokens(
      filters.colors,
      (token) => token.toLowerCase(),
      CATALOG_MAX_COLOR_TOKENS,
    ),
    sizes: normalizeFilterTokens(
      filters.sizes,
      (token) => token.toUpperCase(),
      CATALOG_MAX_SIZE_TOKENS,
    ),
    minPrice: parseFiniteNumber(filters.minPrice),
    maxPrice: parseFiniteNumber(filters.maxPrice),
    sort: parseProductSortOption(filters.sort),
    ids,
  };
}

export function catalogCategoryParam(query: CanonicalCatalogQuery): string | undefined {
  return query.categorySlugs.length > 0 ? query.categorySlugs.join(",") : undefined;
}
