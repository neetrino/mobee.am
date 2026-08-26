import { getCachedProductList } from "@/lib/services/products-list-cached";
import { getCachedProductBySlug } from "@/lib/services/products-slug-cached";
import type { LanguageCode } from "@/lib/language";
import { logger } from "@/lib/utils/logger";

const WARM_LOCALES: LanguageCode[] = ["hy", "en", "ru"];
const PDP_WARM_PRODUCT_LIMIT = 24;
const PDP_WARM_CONCURRENCY = 4;

async function runWithConcurrency(
  tasks: ReadonlyArray<() => Promise<void>>,
  concurrency: number,
): Promise<number> {
  let failed = 0;
  for (let start = 0; start < tasks.length; start += concurrency) {
    const batch = tasks.slice(start, start + concurrency).map((task) => task());
    const outcomes = await Promise.allSettled(batch);
    failed += outcomes.filter((row) => row.status === "rejected").length;
  }
  return failed;
}

export async function warmShopPdpCache(): Promise<void> {
  const started = Date.now();
  const listing = await getCachedProductList({ page: 1, limit: PDP_WARM_PRODUCT_LIMIT, lang: "hy" });
  const slugs = listing.result.data
    .map((item) => item.slug)
    .filter((slug): slug is string => Boolean(slug));
  if (slugs.length === 0) {
    logger.info("[warmShopPdpCache] no products to warm");
    return;
  }

  const tasks = WARM_LOCALES.flatMap((lang) =>
    slugs.map((slug) => () => getCachedProductBySlug(slug, lang).then(() => undefined)),
  );
  const failed = await runWithConcurrency(tasks, PDP_WARM_CONCURRENCY);
  logger.info("[warmShopPdpCache] finished", {
    ms: Date.now() - started,
    slugs: slugs.length,
    failed,
  });
}
