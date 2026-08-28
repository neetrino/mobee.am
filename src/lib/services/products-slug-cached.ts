import { productsService } from "@/lib/services/products.service";
import {
  buildProductDetailCacheKey,
  PRODUCT_DETAIL_CACHE_TTL_SECONDS,
} from "@/lib/shop/product-detail-cache-key";

export type ProductDetailPayload = Awaited<ReturnType<typeof productsService.findBySlug>>;

export { buildProductDetailCacheKey, PRODUCT_DETAIL_CACHE_TTL_SECONDS };

/**
 * PDP loader shared by the API, metadata, and related context.
 * Not Redis-backed: catalog options, stock, and prices must come from the DB.
 */
export async function getCachedProductBySlug(
  slug: string,
  lang: string = "en",
): Promise<{ result: ProductDetailPayload; cacheStatus: "HIT" | "MISS" }> {
  const result = await productsService.findBySlug(slug, lang);
  return { result, cacheStatus: "MISS" };
}
