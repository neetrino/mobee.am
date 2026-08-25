import { productHasMarcoListingImage } from "@/lib/products/marco-product-image";
import type { ProductDiscountContext } from "@/lib/services/products-find-transform.service";
import type { CanonicalCatalogQuery } from "./catalog-query";
import type { CatalogLightRow, CatalogPageSelection } from "./catalog-light.types";
import { rowMatchesPriceFilter } from "./catalog-price";
import { sortCatalogRows } from "./catalog-sort";

export function rowMatchesCatalogFilter(
  row: CatalogLightRow,
  query: CanonicalCatalogQuery,
): boolean {
  if (query.filter === "new" && productHasMarcoListingImage(row)) {
    return false;
  }
  return true;
}

export function filterCatalogRows(
  rows: CatalogLightRow[],
  query: CanonicalCatalogQuery,
  discounts: ProductDiscountContext,
): CatalogLightRow[] {
  return rows.filter((row) => {
    if (!rowMatchesCatalogFilter(row, query)) {
      return false;
    }
    if (!rowMatchesPriceFilter(row, discounts, query.minPrice, query.maxPrice)) {
      return false;
    }
    return true;
  });
}

export function paginateCatalogIds(
  ids: string[],
  page: number,
  limit: number,
): string[] {
  const start = (page - 1) * limit;
  if (start < 0 || start >= ids.length) {
    return [];
  }
  return ids.slice(start, start + limit);
}

function orderIdsPreservingRequest(
  survivingIds: Set<string>,
  requestedIds: string[],
): string[] {
  return requestedIds.filter((id) => survivingIds.has(id));
}

/**
 * Filter full candidate set → sort → paginate. Total is the filtered length.
 * When `ids` is set, request order is kept among products that passed filters.
 */
export function selectCatalogPage(
  rows: CatalogLightRow[],
  query: CanonicalCatalogQuery,
  discounts: ProductDiscountContext,
  bestsellerProductIds: string[],
): CatalogPageSelection {
  const filtered = filterCatalogRows(rows, query, discounts);
  if (query.ids && query.ids.length > 0) {
    const surviving = new Set(filtered.map((row) => row.id));
    const ordered = orderIdsPreservingRequest(surviving, query.ids);
    return {
      ids: paginateCatalogIds(ordered, query.page, query.limit),
      total: ordered.length,
    };
  }
  const sorted = sortCatalogRows(
    filtered,
    query.sort,
    query.lang,
    discounts,
    bestsellerProductIds,
  );
  const ids = sorted.map((row) => row.id);
  return {
    ids: paginateCatalogIds(ids, query.page, query.limit),
    total: ids.length,
  };
}
