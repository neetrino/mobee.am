import type { ProductFilters } from "./types";
import { normalizeCatalogQuery } from "@/lib/catalog/catalog-query";
import { buildCatalogWhere } from "@/lib/catalog/build-catalog-where";

/**
 * Adapter around the catalog where builder (ids, search, category, brand, options).
 */
export async function buildWhereClause(filters: ProductFilters) {
  return buildCatalogWhere(normalizeCatalogQuery(filters));
}
