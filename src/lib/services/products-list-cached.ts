import type { ProductFilters } from "@/lib/services/products-find-query/types";
import {
  buildProductListCacheKey,
  productListCacheTtlSeconds,
} from "@/lib/shop/product-list-cache-key";
import { cacheService } from "@/lib/services/cache.service";
import { productsService } from "@/lib/services/products.service";

export type ProductListPayload = Awaited<ReturnType<typeof productsService.findAll>>;

export { buildProductListCacheKey, productListCacheTtlSeconds };

function isDatabaseConfigurationError(error: unknown): boolean {
  const detail = error instanceof Error ? error.message : String(error);
  return (
    detail.includes("Error validating datasource `db`") ||
    detail.includes("env(\"DATABASE_URL\")") ||
    detail.includes("Invalid `prisma.") ||
    detail.includes("PrismaClientInitializationError") ||
    detail.includes("P1001") ||
    detail.includes("Can't reach database server")
  );
}

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

  let result: ProductListPayload;
  try {
    result = await productsService.findAll(filters);
  } catch (error: unknown) {
    if (!isDatabaseConfigurationError(error)) {
      throw error;
    }

    const page = Number.isFinite(filters.page) && (filters.page ?? 0) > 0 ? (filters.page as number) : 1;
    const limitRaw = Number.isFinite(filters.limit) && (filters.limit ?? 0) > 0 ? (filters.limit as number) : 12;
    const limit = Math.min(limitRaw, 200);

    return {
      result: {
        data: [],
        meta: {
          total: 0,
          page,
          limit,
          totalPages: 0,
        },
      },
      cacheStatus: "MISS",
    };
  }

  const ttl = productListCacheTtlSeconds(filters);
  await cacheService.setex(cacheKey, ttl, JSON.stringify(result));
  return { result, cacheStatus: "MISS" };
}
