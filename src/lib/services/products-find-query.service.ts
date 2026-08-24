import { buildWhereClause } from "./products-find-query/query-builder";
import {
  executeProductQuery,
  fetchProductsPageForPriceSort,
  fetchProductsPageDemotingMarco,
} from "./products-find-query/query-executor";
import { db } from "@white-shop/db";
import type { ProductFilters, ProductWithRelations } from "./products-find-query/types";

/**
 * Service for building and executing product find queries
 */
class ProductsFindQueryService {
  /**
   * Build where clause and fetch products from database
   */
  async buildQueryAndFetch(filters: ProductFilters): Promise<{
    products: ProductWithRelations[];
    bestsellerProductIds: string[];
    total?: number;
  }> {
    const { limit = 12, page = 1, lang = "en" } = filters;

    const { where, bestsellerProductIds } = await buildWhereClause(filters);

    if (where === null) {
      return {
        products: [],
        bestsellerProductIds: [],
        total: 0,
      };
    }

    const isIdsBatchLookup = Boolean(filters.ids?.length);
    /** Card fields only — id batch lookups (compare) must not load productAttributes. */
    const listingMode = true;

    if (isIdsBatchLookup) {
      const products = await executeProductQuery(
        where,
        limit,
        (page - 1) * limit,
        filters.sort,
        listingMode,
        lang,
        isIdsBatchLookup,
      );
      return {
        products,
        bestsellerProductIds,
        total: products.length,
      };
    }

    const isPriceSort =
      filters.sort === "price-asc" || filters.sort === "price-desc";

    const needOverFetch =
      !isIdsBatchLookup &&
      (Boolean(filters.category || filters.search) ||
        filters.minPrice != null ||
        filters.maxPrice != null ||
        Boolean(filters.colors || filters.sizes || filters.brand) ||
        filters.sort === "name-asc" ||
        filters.sort === "name-desc" ||
        filters.sort === "bestseller" ||
        // Best Choice ("new"): over-fetch so Marco-image products can be excluded.
        filters.filter === "new");

    if (isPriceSort && !needOverFetch && !filters.ids?.length) {
      const priceSort =
        filters.sort === "price-desc" ? "price-desc" : "price-asc";
      const [total, products] = await Promise.all([
        db.product.count({ where }),
        fetchProductsPageForPriceSort(
          where,
          limit,
          (page - 1) * limit,
          priceSort,
          listingMode,
          lang,
        ),
      ]);
      return {
        products,
        bestsellerProductIds,
        total,
      };
    }

    const isDefaultSort =
      !filters.sort || filters.sort === "default";

    if (!needOverFetch && isDefaultSort) {
      const [total, products] = await Promise.all([
        db.product.count({ where }),
        fetchProductsPageDemotingMarco(
          where,
          limit,
          (page - 1) * limit,
          listingMode,
          lang,
        ),
      ]);
      return {
        products,
        bestsellerProductIds,
        total,
      };
    }

    if (!needOverFetch) {
      const [total, products] = await Promise.all([
        db.product.count({ where }),
        executeProductQuery(where, limit, (page - 1) * limit, filters.sort, listingMode, lang),
      ]);
      return {
        products,
        bestsellerProductIds,
        total,
      };
    }

    const fetchLimit =
      filters.filter === "new"
        ? Math.min(Math.max(limit * 20, 80), 250)
        : Math.min(limit * 10, 200);
    const products = await executeProductQuery(where, fetchLimit, 0, filters.sort, listingMode, lang);

    return {
      products,
      bestsellerProductIds,
    };
  }
}

export const productsFindQueryService = new ProductsFindQueryService();
export type { ProductFilters, ProductWithRelations };
