import type { Prisma } from "@white-shop/db";
import type { ProductFilters } from "@/lib/services/products-find-query/types";
import type { ProductWithRelations } from "@/lib/services/products-find-query/types";
import type { ProductDiscountContext } from "@/lib/services/products-find-transform.service";
import { loadProductDiscountContext } from "@/lib/services/products-find-transform.service";
import { executeProductQuery } from "@/lib/services/products-find-query/query-executor";
import { normalizeCatalogQuery, type CanonicalCatalogQuery } from "./catalog-query";
import { buildCatalogWhere, type CatalogWhereResult } from "./build-catalog-where";
import { fetchCatalogLightRows } from "./fetch-catalog-light-rows";
import { selectCatalogPage } from "./select-catalog-page";
import type { CatalogLightRow } from "./catalog-light.types";

const EMPTY_DISCOUNTS: ProductDiscountContext = {
  globalDiscount: 0,
  categoryDiscounts: {},
  brandDiscounts: {},
};

export type CatalogFindResult = {
  products: ProductWithRelations[];
  total: number;
  query: CanonicalCatalogQuery;
  discounts: ProductDiscountContext;
};

export type CatalogFindPort = {
  buildWhere: (query: CanonicalCatalogQuery) => Promise<CatalogWhereResult>;
  fetchLightRows: (where: Prisma.ProductWhereInput) => Promise<CatalogLightRow[]>;
  loadPageProducts: (
    ids: string[],
    lang: string,
    includeDescriptions: boolean,
  ) => Promise<ProductWithRelations[]>;
  loadDiscounts: () => Promise<ProductDiscountContext>;
};

async function defaultLoadPageProducts(
  ids: string[],
  lang: string,
  includeDescriptions: boolean,
): Promise<ProductWithRelations[]> {
  if (ids.length === 0) {
    return [];
  }
  const products = await executeProductQuery(
    { published: true, deletedAt: null, id: { in: ids } },
    ids.length,
    0,
    "default",
    true,
    lang,
    includeDescriptions,
  );
  const order = new Map(ids.map((id, index) => [id, index]));
  return [...products].sort(
    (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
  );
}

const defaultPort: CatalogFindPort = {
  buildWhere: buildCatalogWhere,
  fetchLightRows: (where) => fetchCatalogLightRows(where, "list"),
  loadPageProducts: defaultLoadPageProducts,
  loadDiscounts: loadProductDiscountContext,
};

function emptyResult(query: CanonicalCatalogQuery): CatalogFindResult {
  return { products: [], total: 0, query, discounts: EMPTY_DISCOUNTS };
}

/**
 * Filter in DB (except effective price) → exact total → sort → page relations.
 *
 * Residual performance risk: default sort (Marco demotion) and effective-price
 * filter/sort still require an uncapped light-row scan. Exact effective-price
 * pagination cannot move to SQL without a materialized listing-price field.
 */
export async function findCatalogProductPage(
  filters: ProductFilters,
  port: CatalogFindPort = defaultPort,
): Promise<CatalogFindResult> {
  const query = normalizeCatalogQuery(filters);
  const { where, bestsellerProductIds } = await port.buildWhere(query);
  if (where === null) {
    return emptyResult(query);
  }

  const [lightRows, discounts] = await Promise.all([
    port.fetchLightRows(where),
    port.loadDiscounts(),
  ]);
  const page = selectCatalogPage(lightRows, query, discounts, bestsellerProductIds);
  const products = await port.loadPageProducts(
    page.ids,
    query.lang,
    Boolean(query.ids?.length),
  );
  return { products, total: page.total, query, discounts };
}
