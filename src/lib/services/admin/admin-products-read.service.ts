import { getProducts, getProductById } from "./admin-products-read/product-operations";
import type { ProductFilters } from "./admin-products-read/types";

/**
 * Service for admin product read operations
 */
class AdminProductsReadService {
  /**
   * Get products for admin
   */
  async getProducts(filters: ProductFilters) {
    return getProducts(filters);
  }

  /**
   * Get product by ID
   */
  async getProductById(productId: string) {
    return getProductById(productId);
  }
}

export const adminProductsReadService = new AdminProductsReadService();
