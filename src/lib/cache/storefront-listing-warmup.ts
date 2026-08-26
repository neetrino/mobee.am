import { isProductListingReadModelReady } from "@/lib/read-model/read-model-ready";
import { rebuildProductListingReadModel } from "@/lib/read-model/product-read-model-sync";
import { warmPublicShopCaches } from "@/lib/cache/cache-warm-boot";
import { warmHomeListingCache } from "@/lib/cache/warm-home-listing-cache";
import { warmShopPlpListingCache } from "@/lib/cache/warm-shop-plp-cache";
import { warmShopPdpCache } from "@/lib/cache/warm-shop-pdp-cache";
import { logger } from "@/lib/utils/logger";

export async function warmStorefrontListingCaches(): Promise<void> {
  const started = Date.now();
  if (!(await isProductListingReadModelReady())) {
    logger.info("[warmStorefrontListingCaches] read model empty; rebuilding");
    await rebuildProductListingReadModel();
  }
  await warmPublicShopCaches().catch((error: unknown) => {
    logger.warn("[warmStorefrontListingCaches] public caches failed", { error });
  });
  await Promise.allSettled([
    warmHomeListingCache(),
    warmShopPlpListingCache(),
    warmShopPdpCache(),
  ]);
  logger.info("[warmStorefrontListingCaches] finished", { ms: Date.now() - started });
}
