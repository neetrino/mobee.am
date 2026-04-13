import { buildWhereClause } from "./products-find-query/query-builder";
import { executeProductQuery } from "./products-find-query/query-executor";
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
    const { limit = 12, page = 1 } = filters;

    const { where, bestsellerProductIds } = await buildWhereClause(filters);

    if (where === null) {
      return {
        products: [],
        bestsellerProductIds: [],
        total: 0,
      };
    }

    const needOverFetch =
      Boolean(filters.category || filters.search) ||
      filters.minPrice != null ||
      filters.maxPrice != null ||
      Boolean(filters.colors || filters.sizes || filters.brand);

    if (!needOverFetch) {
      const [total, products] = await Promise.all([
        db.product.count({ where }),
        executeProductQuery(where, limit, (page - 1) * limit),
      ]);
      return {
        products,
        bestsellerProductIds,
        total,
      };
    }

    const fetchLimit = Math.min(limit * 10, 200);
    const products = await executeProductQuery(where, fetchLimit, 0);

    return {
      products,
      bestsellerProductIds,
    };
  }
}

export const productsFindQueryService = new ProductsFindQueryService();
export type { ProductFilters, ProductWithRelations };
