import type { Prisma } from "@white-shop/db";
import { buildCategoryTreesOrWhere } from "@/lib/services/products-find-query/category-utils";
import { CATALOG_NEW_ARRIVAL_DAYS } from "./catalog.constants";
import type { CanonicalCatalogQuery } from "./catalog-query";
import { catalogCategoryParam } from "./catalog-query";
import { CatalogQueryError } from "./catalog-query-error";
import { buildSearchWhere } from "./search-where";
import { buildBrandWhere, resolveBrandIds } from "./brand-where";
import { buildVariantOptionWhere } from "./variant-option-where";
import { getBestsellerProductIdsRanked } from "./bestsellers";

export type CatalogWhereResult = {
  where: Prisma.ProductWhereInput | null;
  bestsellerProductIds: string[];
};

export type CatalogWhereScope = {
  includeBrand: boolean;
  includeOptions: boolean;
};

export const CATALOG_LIST_WHERE_SCOPE: CatalogWhereScope = {
  includeBrand: true,
  includeOptions: true,
};

export const CATALOG_FACET_WHERE_SCOPE: CatalogWhereScope = {
  includeBrand: false,
  includeOptions: false,
};

type CatalogWhereDeps = {
  resolveBrands: typeof resolveBrandIds;
  resolveCategory: typeof buildCategoryTreesOrWhere;
  bestsellers: typeof getBestsellerProductIdsRanked;
};

const defaultDeps: CatalogWhereDeps = {
  resolveBrands: resolveBrandIds,
  resolveCategory: buildCategoryTreesOrWhere,
  bestsellers: getBestsellerProductIdsRanked,
};

function publishedBaseWhere(): Prisma.ProductWhereInput {
  return { published: true, deletedAt: null };
}

function newArrivalWhere(): Prisma.ProductWhereInput {
  const since = new Date();
  since.setDate(since.getDate() - CATALOG_NEW_ARRIVAL_DAYS);
  return { createdAt: { gte: since } };
}

async function appendFilterClause(
  query: CanonicalCatalogQuery,
  parts: Prisma.ProductWhereInput[],
  deps: CatalogWhereDeps,
): Promise<string[]> {
  if (query.filter === "new") {
    parts.push(newArrivalWhere());
    return [];
  }
  if (query.filter === "featured") {
    parts.push({ featured: true });
    return [];
  }
  if (query.filter !== "bestseller" && query.sort !== "bestseller") {
    return [];
  }

  const ranked = await deps.bestsellers();
  if (query.filter === "bestseller") {
    parts.push({ id: { in: ranked } });
  }
  return ranked;
}

/**
 * Full DB where: published, search, category tree, brand, color/size, filter, optional ids.
 * Price is applied later (effective listing price is not a Prisma field).
 * `ids` constrains the candidate set; it does not skip other filters.
 */
export async function buildCatalogWhere(
  query: CanonicalCatalogQuery,
  deps: CatalogWhereDeps = defaultDeps,
  scope: CatalogWhereScope = CATALOG_LIST_WHERE_SCOPE,
): Promise<CatalogWhereResult> {
  const parts: Prisma.ProductWhereInput[] = [publishedBaseWhere()];

  if (query.ids && query.ids.length > 0) {
    parts.push({ id: { in: query.ids } });
  }

  if (query.search) {
    parts.push(buildSearchWhere(query.search));
  }

  const categoryParam = catalogCategoryParam(query);
  if (categoryParam) {
    const categoryWhere = await deps.resolveCategory(categoryParam, query.lang);
    if (categoryWhere === null) {
      throw new CatalogQueryError("Unknown category");
    }
    parts.push(categoryWhere);
  }

  if (scope.includeBrand) {
    const brandWhere = buildBrandWhere(await deps.resolveBrands(query.brands));
    if (brandWhere) {
      parts.push(brandWhere);
    }
  }

  if (scope.includeOptions) {
    const optionWhere = buildVariantOptionWhere(query.colors, query.sizes);
    if (optionWhere) {
      parts.push(optionWhere);
    }
  }

  const bestsellerProductIds = await appendFilterClause(query, parts, deps);

  return {
    where: { AND: parts },
    bestsellerProductIds,
  };
}
