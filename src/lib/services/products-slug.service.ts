import { buildProductQuery } from "./products-slug/product-query-builder";
import { transformProduct } from "./products-slug/product-transformer";

/**
 * Service for fetching products by slug
 */
class ProductsSlugService {
  /**
   * Get product by slug
   */
  async findBySlug(slug: string, lang: string = "en") {
    // Build and execute query with comprehensive error handling
    const product = await buildProductQuery(slug, lang);

    if (!product) {
      throw {
        status: 404,
        type: "https://api.shop.am/problems/not-found",
        title: "Product not found",
        detail: `Product with slug '${slug}' does not exist or is not published`,
      };
    }

    // Transform product data to response format
    return transformProduct(product, lang);
  }
}

export const productsSlugService = new ProductsSlugService();
