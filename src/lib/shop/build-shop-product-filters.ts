import type { ProductFilters } from "@/lib/services/products-find-query/types";
import {
  parseCatalogHttpParams,
  searchParamsToRecord,
} from "@/lib/catalog/catalog-http-query";

/**
 * Build product list filters for the shop page — same rules as GET /api/v1/products.
 */
export function buildShopProductFiltersFromSearchParams(
  params: Record<string, string | undefined>,
  lang: string,
): ProductFilters {
  return parseCatalogHttpParams(params, lang);
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
