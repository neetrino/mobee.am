import { getCachedProductList } from "@/lib/services/products-list-cached";
import { CATALOG_DEFAULT_LIMIT } from "@/lib/catalog/catalog.constants";
import type { LanguageCode } from "@/lib/language";
import { logger } from "@/lib/utils/logger";

const WARM_LOCALES: LanguageCode[] = ["hy", "en", "ru"];

export async function warmShopPlpListingCache(): Promise<void> {
  const started = Date.now();
  const tasks = WARM_LOCALES.map((lang) =>
    getCachedProductList({ page: 1, limit: CATALOG_DEFAULT_LIMIT, lang }),
  );
  const outcomes = await Promise.allSettled(tasks);
  logger.info("[warmShopPlpListingCache] finished", {
    ms: Date.now() - started,
    failed: outcomes.filter((row) => row.status === "rejected").length,
  });
}
