import { cacheService } from "@/lib/services/cache.service";
import { CATALOG_DISCOUNT_CACHE_KEY } from "./catalog.constants";

/**
 * Drop list/facet caches after catalog-affecting writes.
 */
export async function invalidateCatalogCaches(): Promise<void> {
  await cacheService.deletePattern("products:*");
  await cacheService.del(CATALOG_DISCOUNT_CACHE_KEY);
}
