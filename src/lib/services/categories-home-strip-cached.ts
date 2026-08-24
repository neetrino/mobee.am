import { db } from '@white-shop/db';
import type { CategoryTreeNode } from '@/lib/category-nav';
import { pickHomeStripCategories } from '@/lib/categoryHomeStripOrder';
import { resolveLocalizedCategoryFields } from '@/lib/category-title-i18n';
import type { LanguageCode } from '@/lib/language';
import { cacheService } from '@/lib/services/cache.service';

const CACHE_TTL_SECONDS = 300;

export type HomeStripCategoryItem = CategoryTreeNode & {
  position: number;
};

export type HomeCategoryStripPayload = {
  data: HomeStripCategoryItem[];
};

function buildHomeStripCacheKey(lang: string): string {
  // v5: localize titles via dictionary when DB en/ru rows are missing/Armenian.
  return `categories:home-strip:v5:${lang}`;
}

/**
 * Home page category strip follows `/supersudo/categories` display order (`position`).
 */
export async function getCachedHomeCategoryStrip(
  lang: string,
): Promise<{ result: HomeCategoryStripPayload; cacheStatus: 'HIT' | 'MISS' }> {
  const cacheKey = buildHomeStripCacheKey(lang);
  const cached = await cacheService.get(cacheKey);
  if (cached !== null && cached !== undefined) {
    const result =
      typeof cached === 'string'
        ? (JSON.parse(cached) as HomeCategoryStripPayload)
        : (cached as HomeCategoryStripPayload);
    return { result, cacheStatus: 'HIT' };
  }

  const categories = await db.category.findMany({
    where: {
      published: true,
      deletedAt: null,
    },
    include: {
      translations: true,
    },
    orderBy: {
      position: 'asc',
    },
  });

  const orderedCategories = pickHomeStripCategories(
    categories.map((category) => ({
      id: category.id,
      parentId: category.parentId,
      position: category.position,
      showOnHomePage: category.homeStripPosition !== null,
    })),
  );

  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const locale = lang as LanguageCode;

  const data = orderedCategories.flatMap((orderedCategory, index): HomeStripCategoryItem[] => {
    const category = categoryById.get(orderedCategory.id);
    if (!category) {
      return [];
    }

    const localized = resolveLocalizedCategoryFields(category.translations, locale);
    if (!localized || !localized.slug) {
      return [];
    }

    return [
      {
        id: category.id,
        slug: localized.slug,
        title: localized.title,
        fullPath: localized.fullPath || localized.slug,
        media: category.media ?? [],
        children: [],
        position: index,
      },
    ];
  });

  const result: HomeCategoryStripPayload = { data };
  await cacheService.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(result));
  return { result, cacheStatus: 'MISS' };
}
