import type { ProductFilters } from "./products-find-query.service";
import { getCatalogFacets } from "@/lib/catalog/catalog-facets";
import { logger } from "../utils/logger";

class ProductsFiltersService {
  /**
   * Facets for the shop sidebar — same catalog semantics as the product list.
   */
  async getFilters(filters: ProductFilters) {
    return getCatalogFacets(filters);
  }

  async getPriceRange(filters: ProductFilters) {
    try {
      const facets = await getCatalogFacets(filters);
      return facets.priceRange;
    } catch (error: unknown) {
      logger.error("Failed to load catalog price range", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

export const productsFiltersService = new ProductsFiltersService();
