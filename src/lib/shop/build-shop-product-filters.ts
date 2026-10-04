import type { ProductFilters } from "@/lib/services/products-find-query/types";
import {
  parseCatalogHttpParams,
  searchParamsToRecord,
} from "@/lib/catalog/catalog-http-query";
import { SHOP_PAGE_DEFAULT_LIMIT } from "@/lib/catalog/catalog.constants";

/**
 * Build product list filters for the shop page — same rules as GET /api/v1/products,
 * except a missing `limit` uses the taller shop default so the grid fills the filter column.
 */
export function buildShopProductFiltersFromSearchParams(
  params: Record<string, string | undefined>,
  lang: string,
): ProductFilters {
  const filters = parseCatalogHttpParams(params, lang);
  const hasExplicitLimit = Boolean(params.limit?.trim());
  if (hasExplicitLimit) {
    return filters;
  }
  return { ...filters, limit: SHOP_PAGE_DEFAULT_LIMIT };
}

/**
 * Parse GET /api/v1/products query string (includes optional `ids` for compare).
 */
export function buildProductListFiltersFromUrlSearchParams(
  searchParams: URLSearchParams,
): ProductFilters {
  const lang = searchParams.get("lang") || "en";
  return parseCatalogHttpParams(
    searchParamsToRecord(searchParams),
    lang,
    searchParams.get("ids") ?? undefined,
  );
}
