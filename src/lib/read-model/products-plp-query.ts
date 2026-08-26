import { db } from "@white-shop/db";
import type { ProductFilters } from "@/lib/services/products-find-query/types";
import type { ProductWithRelations } from "@/lib/services/products-find-query/types";
import type { ProductDiscountContext } from "@/lib/services/products-find-transform.service";
import { normalizeCatalogQuery, type CanonicalCatalogQuery } from "@/lib/catalog/catalog-query";
import { getBestsellerProductIdsRanked } from "@/lib/catalog/bestsellers";
import { loadProductDiscountContext } from "@/lib/services/products-find-transform.service";
import { executeProductQuery } from "@/lib/services/products-find-query/query-executor";
import {
  buildListingRowWhere,
  listingRowOrderBy,
} from "@/lib/read-model/products-plp-read-model-where";

const EMPTY_DISCOUNTS: ProductDiscountContext = {
  globalDiscount: 0,
  categoryDiscounts: {},
  brandDiscounts: {},
};

async function loadPageProducts(
  ids: string[],
  lang: string,
  includeDescriptions: boolean,
) {
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

function paginateIds(ids: string[], page: number, limit: number): string[] {
  const start = (page - 1) * limit;
  if (start < 0 || start >= ids.length) {
    return [];
  }
  return ids.slice(start, start + limit);
}

async function fetchBestsellerPageIds(
  where: NonNullable<Awaited<ReturnType<typeof buildListingRowWhere>>>,
  ranked: string[],
  page: number,
  limit: number,
  requestedIds?: string[],
): Promise<{ ids: string[]; total: number }> {
  const rows = await db.productListingRow.findMany({
    where,
    select: { productId: true },
  });
  const surviving = new Set(rows.map((row) => row.productId));
  const ordered = requestedIds?.length
    ? requestedIds.filter((id) => surviving.has(id))
    : ranked.filter((id) => surviving.has(id)).concat(
        [...surviving].filter((id) => !ranked.includes(id)),
      );
  return {
    ids: paginateIds(ordered, page, limit),
    total: ordered.length,
  };
}

export type ListingReadModelPage = {
  products: ProductWithRelations[];
  total: number;
  query: CanonicalCatalogQuery;
  discounts: ProductDiscountContext;
};

/**
 * PLP from ProductListingRow: indexed filter/sort/count, then page-only Product include.
 */
export async function findCatalogProductPageFromReadModel(
  filters: ProductFilters,
): Promise<ListingReadModelPage> {
  const query = normalizeCatalogQuery(filters);
  const needsBestsellers =
    query.filter === "bestseller" || query.sort === "bestseller";
  const bestsellerProductIds = needsBestsellers
    ? await getBestsellerProductIdsRanked()
    : [];
  const where = await buildListingRowWhere(query, bestsellerProductIds);
  if (where === null) {
    return { products: [], total: 0, query, discounts: EMPTY_DISCOUNTS };
  }

  const discountsPromise = loadProductDiscountContext();

  if (query.sort === "bestseller") {
    const page = await fetchBestsellerPageIds(
      where,
      bestsellerProductIds,
      query.page,
      query.limit,
      query.ids,
    );
    const [products, discounts] = await Promise.all([
      loadPageProducts(page.ids, query.lang, Boolean(query.ids?.length)),
      discountsPromise,
    ]);
    return { products, total: page.total, query, discounts };
  }

  const skip = (query.page - 1) * query.limit;
  const [total, rows, discounts] = await Promise.all([
    db.productListingRow.count({ where }),
    db.productListingRow.findMany({
      where,
      orderBy: listingRowOrderBy(query),
      skip: skip < 0 ? 0 : skip,
      take: query.limit,
      select: { productId: true },
    }),
    discountsPromise,
  ]);

  const ids = rows.map((row) => row.productId);
  const products = await loadPageProducts(ids, query.lang, Boolean(query.ids?.length));
  return { products, total, query, discounts };
}
