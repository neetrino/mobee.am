import type { ProductFilters } from "@/lib/services/products-find-query/types";
import {
  buildProductListCacheKey,
  productListCacheTtlSeconds,
} from "@/lib/shop/product-list-cache-key";
import { cacheService } from "@/lib/services/cache.service";
import { productsService } from "@/lib/services/products.service";

export type ProductListPayload = Awaited<ReturnType<typeof productsService.findAll>>;

export { buildProductListCacheKey, productListCacheTtlSeconds };

/**
 * Redis / in-memory cached product list — use from the HTTP route and from RSC (/shop).
 */
export async function getCachedProductList(
  filters: ProductFilters,
): Promise<{ result: ProductListPayload; cacheStatus: "HIT" | "MISS" }> {
  const cacheKey = buildProductListCacheKey(filters);
  const cached = await cacheService.get(cacheKey);
  if (cached !== null && cached !== undefined) {
    const data =
      typeof cached === "string"
        ? (JSON.parse(cached) as ProductListPayload)
        : (cached as ProductListPayload);
    return { result: data, cacheStatus: "HIT" };
  }

  const result = await productsService.findAll(filters);
  const ttl = productListCacheTtlSeconds(filters);
  await cacheService.setex(cacheKey, ttl, JSON.stringify(result));
  return { result, cacheStatus: "MISS" };
}
