import { getCachedProductList } from "@/lib/services/products-list-cached";
import {
  buildHomeFeaturedProductFilters,
  buildHomeSpecialOffersProductFilters,
} from "@/lib/home/home-product-filters";
import type { LanguageCode } from "@/lib/language";
import { logger } from "@/lib/utils/logger";

const WARM_LOCALES: LanguageCode[] = ["hy", "en"];

export async function warmHomeListingCache(): Promise<void> {
  const started = Date.now();
  const tasks = WARM_LOCALES.flatMap((lang) => [
    getCachedProductList(buildHomeFeaturedProductFilters(lang)),
    getCachedProductList(buildHomeSpecialOffersProductFilters(lang)),
  ]);
  const outcomes = await Promise.allSettled(tasks);
  logger.info("[warmHomeListingCache] finished", {
    ms: Date.now() - started,
    failed: outcomes.filter((row) => row.status === "rejected").length,
  });
}
