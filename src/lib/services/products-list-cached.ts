import { logger } from "@/lib/utils/logger";
import { buildProductListCacheKey, productListCacheTtlSeconds } from "@/lib/shop/product-list-cache-key";
import { cacheService } from "@/lib/services/cache.service";
import { productsService } from "@/lib/services/products.service";
import type { ProductFilters } from "@/lib/services/products-find-query/types";

export type ProductListPayload = Awaited<ReturnType<typeof productsService.findAll>>;

export { buildProductListCacheKey, productListCacheTtlSeconds };

function parseProductListPayload(cached: string | unknown): ProductListPayload | null {
  try {
    const data = typeof cached === "string" ? JSON.parse(cached) : cached;
    if (!data || typeof data !== "object") {
      return null;
    }
    const payload = data as Partial<ProductListPayload>;
    if (!Array.isArray(payload.data) || typeof payload.meta !== "object" || payload.meta === null) {
      return null;
    }
    return payload as ProductListPayload;
  } catch {
    return null;
  }
}

async function readProductListCache(cacheKey: string): Promise<ProductListPayload | null> {
  try {
    const cached = await cacheService.get(cacheKey);
    return parseProductListPayload(cached);
  } catch (error: unknown) {
    logger.warn("Catalog list cache read failed; falling back to database", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Redis cached product list. Cache failures fail-open to DB; DB failures are not cached.
 */
export async function getCachedProductList(
  filters: ProductFilters,
): Promise<{ result: ProductListPayload; cacheStatus: "HIT" | "MISS" }> {
  const cacheKey = buildProductListCacheKey(filters);
  const cached = await readProductListCache(cacheKey);
  if (cached) {
    return { result: cached, cacheStatus: "HIT" };
  }

  const result = await productsService.findAll(filters);
  const ttl = productListCacheTtlSeconds(filters);
  try {
    await cacheService.setex(cacheKey, ttl, JSON.stringify(result));
  } catch (error: unknown) {
    logger.warn("Catalog list cache write failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
  return { result, cacheStatus: "MISS" };
}
