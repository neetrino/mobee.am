import { findCatalogProductPage } from "@/lib/catalog/catalog-find";
import type { ProductFilters, ProductWithRelations } from "./products-find-query/types";

/**
 * Adapter: catalog pipeline with the historical query-service return shape.
 */
class ProductsFindQueryService {
  async buildQueryAndFetch(filters: ProductFilters): Promise<{
    products: ProductWithRelations[];
    bestsellerProductIds: string[];
    total?: number;
  }> {
    const { products, total } = await findCatalogProductPage(filters);
    return {
      products,
      bestsellerProductIds: [],
      total,
    };
  }
}

export const productsFindQueryService = new ProductsFindQueryService();
export type { ProductFilters, ProductWithRelations };
