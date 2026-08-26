import { getCachedCategoriesTree } from "@/lib/services/categories-tree-cached";
import { getCachedHomeCategoryStrip } from "@/lib/services/categories-home-strip-cached";
import { getPublicHomeHeroSettings } from "@/lib/services/home-hero.service";

const WARM_LOCALES = ["hy", "en", "ru"] as const;

export async function warmPublicShopCaches(): Promise<void> {
  await Promise.all([
    getPublicHomeHeroSettings(),
    ...WARM_LOCALES.map((lang) => getCachedCategoriesTree(lang)),
    ...WARM_LOCALES.map((lang) => getCachedHomeCategoryStrip(lang)),
  ]);
}
