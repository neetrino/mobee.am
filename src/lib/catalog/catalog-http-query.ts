import type { ProductFilters } from "@/lib/services/products-find-query/types";
import { PRODUCT_SORT_OPTIONS, type ProductSortOption } from "@/lib/products/sort";
import {
  CATALOG_KNOWN_FILTERS,
  CATALOG_MAX_IDS,
} from "./catalog.constants";
import { CatalogQueryError } from "./catalog-query-error";
import { catalogCategoryParam, normalizeCatalogQuery } from "./catalog-query";

const POSITIVE_INT_RE = /^[1-9]\d*$/;
const NON_NEGATIVE_NUMBER_RE = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;

function presentString(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

function parseHttpPositiveInt(
  raw: string | undefined,
  field: string,
): number | undefined {
  const value = presentString(raw);
  if (value === undefined) {
    return undefined;
  }
  if (!POSITIVE_INT_RE.test(value)) {
    throw new CatalogQueryError(`Invalid ${field}`);
  }
  return Number.parseInt(value, 10);
}

function parseHttpNonNegativeNumber(
  raw: string | undefined,
  field: string,
): number | undefined {
  const value = presentString(raw);
  if (value === undefined) {
    return undefined;
  }
  if (!NON_NEGATIVE_NUMBER_RE.test(value)) {
    throw new CatalogQueryError(`Invalid ${field}`);
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new CatalogQueryError(`Invalid ${field}`);
  }
  return parsed;
}

function parseHttpSort(raw: string | undefined): ProductSortOption | undefined {
  const value = presentString(raw);
  if (value === undefined) {
    return undefined;
  }
  if (!PRODUCT_SORT_OPTIONS.includes(value as ProductSortOption)) {
    throw new CatalogQueryError("Invalid sort");
  }
  return value as ProductSortOption;
}

function parseHttpFilter(raw: string | undefined): string | undefined {
  const value = presentString(raw)?.toLowerCase();
  if (value === undefined) {
    return undefined;
  }
  if (
    !CATALOG_KNOWN_FILTERS.includes(value as (typeof CATALOG_KNOWN_FILTERS)[number])
  ) {
    throw new CatalogQueryError("Invalid filter");
  }
  return value;
}

function parseHttpIds(raw: string | undefined): string[] | undefined {
  const value = presentString(raw);
  if (value === undefined) {
    return undefined;
  }
  const ids = [
    ...new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ].slice(0, CATALOG_MAX_IDS);
  return ids.length > 0 ? ids : undefined;
}

/**
 * Strict HTTP query → typed ProductFilters. Rejects partial numbers and unknown sort/filter.
 */
export function parseCatalogHttpParams(
  params: Record<string, string | undefined>,
  lang: string,
  idsRaw?: string,
): ProductFilters {
  const page = parseHttpPositiveInt(params.page, "page");
  const limit = parseHttpPositiveInt(params.limit, "limit");
  const minPrice = parseHttpNonNegativeNumber(params.minPrice, "minPrice");
  const maxPrice = parseHttpNonNegativeNumber(params.maxPrice, "maxPrice");
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    throw new CatalogQueryError("minPrice must be less than or equal to maxPrice");
  }

  const canonical = normalizeCatalogQuery({
    category: params.category,
    search: params.search,
    filter: parseHttpFilter(params.filter || params.filters),
    minPrice,
    maxPrice,
    colors: params.colors,
    sizes: params.sizes,
    brand: params.brand,
    sort: parseHttpSort(params.sort),
    page,
    limit,
    lang,
    ids: parseHttpIds(idsRaw),
  });

  return {
    category: catalogCategoryParam(canonical),
    search: canonical.search,
    filter: canonical.filter,
    minPrice: canonical.minPrice,
    maxPrice: canonical.maxPrice,
    colors: canonical.colors.length > 0 ? canonical.colors.join(",") : undefined,
    sizes: canonical.sizes.length > 0 ? canonical.sizes.join(",") : undefined,
    brand: canonical.brands.length > 0 ? canonical.brands.join(",") : undefined,
    sort: canonical.sort,
    page: canonical.page,
    limit: canonical.limit,
    lang: canonical.lang,
    ids: canonical.ids,
  };
}

export function searchParamsToRecord(
  searchParams: URLSearchParams,
): Record<string, string | undefined> {
  return {
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
}

export function urlSearchParamsToRecord(
  searchParams: Iterable<[string, string]>,
): Record<string, string | undefined> {
  const record: Record<string, string | undefined> = {};
  for (const [key, value] of searchParams) {
    record[key] = value;
  }
  if (record.filter === undefined && record.filters) {
    record.filter = record.filters;
  }
  return record;
}
