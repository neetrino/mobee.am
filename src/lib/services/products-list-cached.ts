import { logger } from "@/lib/utils/logger";
import { buildProductListCacheKey, productListCacheTtlSeconds } from "@/lib/shop/product-list-cache-key";
import { getCachedJson } from "@/lib/services/read-through-json-cache";
import { productsService } from "@/lib/services/products.service";
import type { ProductFilters } from "@/lib/services/products-find-query/types";

export type ProductListPayload = Awaited<ReturnType<typeof productsService.findAll>>;

export { buildProductListCacheKey, productListCacheTtlSeconds };

function isProductListPayload(data: unknown): data is ProductListPayload {
  if (!data || typeof data !== "object") {
    return false;
  }
  const payload = data as Partial<ProductListPayload>;
  return Array.isArray(payload.data) && typeof payload.meta === "object" && payload.meta !== null;
}

/**
 * Redis cached product list. Cache failures fail-open to DB; DB failures are not cached.
 */
export async function getCachedProductList(
  filters: ProductFilters,
): Promise<{ result: ProductListPayload; cacheStatus: "HIT" | "MISS" }> {
  const cacheKey = buildProductListCacheKey(filters);
  const ttl = productListCacheTtlSeconds(filters);
  const { result, cacheStatus } = await getCachedJson<ProductListPayload>(
    cacheKey,
    ttl,
    async () => productsService.findAll(filters),
  );
  if (!isProductListPayload(result)) {
    logger.warn("Catalog list cache payload invalid; refetching", { cacheKey });
    const fresh = await productsService.findAll(filters);
    return { result: fresh, cacheStatus: "MISS" };
  }
  return { result, cacheStatus };
}
