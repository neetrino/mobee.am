import type { ProductFilters } from "@/lib/services/products-find-query/types";

/**
 * Flat query params for GET /api/v1/products (matches buildProductListFiltersFromUrlSearchParams).
 */
export function productFiltersToApiParams(filters: ProductFilters): Record<string, string> {
  const p: Record<string, string> = {
    lang: filters.lang || "en",
    page: String(filters.page ?? 1),
    limit: String(filters.limit ?? 12),
  };
  if (filters.category) p.category = filters.category;
  if (filters.search) p.search = filters.search;
  if (filters.filter) p.filter = filters.filter;
  if (filters.minPrice != null && !Number.isNaN(filters.minPrice)) {
    p.minPrice = String(filters.minPrice);
  }
  if (filters.maxPrice != null && !Number.isNaN(filters.maxPrice)) {
    p.maxPrice = String(filters.maxPrice);
  }
  if (filters.colors) p.colors = filters.colors;
  if (filters.sizes) p.sizes = filters.sizes;
  if (filters.brand) p.brand = filters.brand;
  if (filters.sort && filters.sort !== "default") p.sort = filters.sort;
  if (filters.ids?.length) p.ids = filters.ids.join(",");
  return p;
}
