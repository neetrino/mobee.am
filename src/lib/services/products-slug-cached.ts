import { productsService } from "@/lib/services/products.service";
import { getCachedJson } from "@/lib/services/read-through-json-cache";
import {
  buildProductDetailCacheKey,
  PRODUCT_DETAIL_CACHE_TTL_SECONDS,
} from "@/lib/shop/product-detail-cache-key";

export type ProductDetailPayload = Awaited<ReturnType<typeof productsService.findBySlug>>;

export { buildProductDetailCacheKey, PRODUCT_DETAIL_CACHE_TTL_SECONDS };

function isNotFoundError(error: unknown): boolean {
  return (error as { status?: number }).status === 404;
}

/**
 * Redis / in-memory cached product detail — shared by API route, metadata, and related context.
 */
export async function getCachedProductBySlug(
  slug: string,
  lang: string = "en",
): Promise<{ result: ProductDetailPayload; cacheStatus: "HIT" | "MISS" }> {
  const cacheKey = buildProductDetailCacheKey(slug, lang);
  try {
    return await getCachedJson<ProductDetailPayload>(
      cacheKey,
      PRODUCT_DETAIL_CACHE_TTL_SECONDS,
      () => productsService.findBySlug(slug, lang),
      { requireSharedCache: true },
    );
  } catch (error: unknown) {
    if (isNotFoundError(error)) {
      throw error;
    }
    throw error;
  }
}
