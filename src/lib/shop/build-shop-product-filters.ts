import type { ProductFilters } from "@/lib/services/products-find-query/types";
import { parseProductSortOption } from "@/lib/products/sort";

const MAX_IDS = 20;

function parseIdsParam(raw: string | null): string[] | undefined {
  if (!raw?.trim()) return undefined;
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_IDS);
  return ids.length > 0 ? ids : undefined;
}

/**
 * Build product list filters for the shop page — same rules as GET /api/v1/products (without `ids` from URL).
 */
export function buildShopProductFiltersFromSearchParams(
  params: Record<string, string | undefined>,
  lang: string,
): ProductFilters {
  const sort = parseProductSortOption(params?.sort);

  const limitParam = params?.limit?.toString().trim();
  const parsedLimit =
    limitParam && !Number.isNaN(parseInt(limitParam, 10))
      ? parseInt(limitParam, 10)
      : null;
  const limit = parsedLimit ? Math.min(parsedLimit, 200) : 12;

  const pageRaw = params?.page?.trim();
  const pageParsed = pageRaw ? parseInt(pageRaw, 10) : 1;

  return {
    category: params?.category?.trim() || undefined,
    search: params?.search?.trim() || undefined,
    filter: params?.filter?.trim() || params?.filters?.trim() || undefined,
    minPrice: params?.minPrice?.trim()
      ? parseFloat(params.minPrice)
      : undefined,
    maxPrice: params?.maxPrice?.trim()
      ? parseFloat(params.maxPrice)
      : undefined,
    colors: params?.colors?.trim() || undefined,
    sizes: params?.sizes?.trim() || undefined,
    brand: params?.brand?.trim() || undefined,
    sort,
    page: Number.isFinite(pageParsed) && pageParsed >= 1 ? pageParsed : 1,
    limit,
    lang,
  };
}

/**
 * Parse GET /api/v1/products query string (includes optional `ids` for compare, etc.).
 */
export function buildProductListFiltersFromUrlSearchParams(
  searchParams: URLSearchParams,
): ProductFilters {
  const lang = searchParams.get("lang") || "en";
  const ids = parseIdsParam(searchParams.get("ids"));
  const record: Record<string, string | undefined> = {
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    filter: searchParams.get("filter") ?? searchParams.get("filters") ?? undefined,
    minPrice: searchParams.get("minPrice") ?? undefined,
    maxPrice: searchParams.get("maxPrice") ?? undefined,
    colors: searchParams.get("colors") ?? undefined,
    sizes: searchParams.get("sizes") ?? undefined,
    brand: searchParams.get("brand") ?? undefined,
    sort: searchParams.get("sort") ?? undefined,
  };
  const base = buildShopProductFiltersFromSearchParams(record, lang);
  if (ids?.length) {
    return {
      ...base,
      ids,
      limit: Math.min(Math.max(base.limit ?? 12, ids.length), 200),
    };
  }
  return base;
}
