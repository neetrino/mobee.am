import { cacheService } from "@/lib/services/cache.service";
import { productsService } from "@/lib/services/products.service";
import {
  buildProductDetailCacheKey,
  PRODUCT_DETAIL_CACHE_TTL_SECONDS,
} from "@/lib/shop/product-detail-cache-key";

export type ProductDetailPayload = Awaited<ReturnType<typeof productsService.findBySlug>>;

export { buildProductDetailCacheKey, PRODUCT_DETAIL_CACHE_TTL_SECONDS };

const inflightByKey = new Map<string, Promise<ProductDetailPayload>>();

function isNotFoundError(error: unknown): boolean {
  return (error as { status?: number }).status === 404;
}

function parseCachedProductDetail(raw: string | unknown): ProductDetailPayload | null {
  if (raw === null || raw === undefined) {
    return null;
  }

  try {
    return (typeof raw === "string" ? JSON.parse(raw) : raw) as ProductDetailPayload;
  } catch {
    return null;
  }
}

/**
 * Redis / in-memory cached product detail — shared by API route, metadata, and related context.
 */
export async function getCachedProductBySlug(
  slug: string,
  lang: string = "en",
): Promise<{ result: ProductDetailPayload; cacheStatus: "HIT" | "MISS" }> {
  const cacheKey = buildProductDetailCacheKey(slug, lang);
  const cached = await cacheService.get(cacheKey);
  const parsed = parseCachedProductDetail(cached);
  if (parsed) {
    return { result: parsed, cacheStatus: "HIT" };
  }

  const inflight = inflightByKey.get(cacheKey);
  if (inflight) {
    const result = await inflight;
    return { result, cacheStatus: "MISS" };
  }

  const loader = productsService.findBySlug(slug, lang).finally(() => {
    inflightByKey.delete(cacheKey);
  });
  inflightByKey.set(cacheKey, loader);

  try {
    const result = await loader;
    await cacheService.setex(
      cacheKey,
      PRODUCT_DETAIL_CACHE_TTL_SECONDS,
      JSON.stringify(result),
    );
    return { result, cacheStatus: "MISS" };
  } catch (error: unknown) {
    if (isNotFoundError(error)) {
      throw error;
    }
    throw error;
  }
}
