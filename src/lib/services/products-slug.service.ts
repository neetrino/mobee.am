import { buildProductQuery, findProductIdBySlug } from "./products-slug/product-query-builder";
import { transformProduct } from "./products-slug/product-transformer";

/**
 * Service for fetching products by slug.
 * Always reads live Product / ProductVariantOption — never a PDP snapshot or Redis.
 */
class ProductsSlugService {
  /**
   * Resolve product id by slug without loading full product graph.
   */
  async findProductIdBySlug(slug: string, lang: string = "en") {
    return findProductIdBySlug(slug, lang);
  }

  /**
   * Get product by slug from the database.
   */
  async findBySlug(slug: string, lang: string = "en") {
    const product = await buildProductQuery(slug, lang);

    if (!product) {
      throw {
        status: 404,
        type: "https://api.shop.am/problems/not-found",
        title: "Product not found",
        detail: `Product with slug '${slug}' does not exist or is not published`,
      };
    }

    return transformProduct(product, lang);
  }
}

export const productsSlugService = new ProductsSlugService();
