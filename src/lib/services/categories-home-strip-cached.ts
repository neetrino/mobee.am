import { db } from '@white-shop/db';
import type { CategoryTreeNode } from '@/lib/category-nav';
import { pickHomeStripCategories } from '@/lib/categoryHomeStripOrder';
import { resolveLocalizedCategoryFields } from '@/lib/category-title-i18n';
import type { LanguageCode } from '@/lib/language';
import { getCachedJson } from '@/lib/services/read-through-json-cache';
import { CATEGORIES_CACHE_TTL_SEC } from '@/lib/cache/public-cache-keys';

export type HomeStripCategoryItem = CategoryTreeNode & {
  position: number;
};

export type HomeCategoryStripPayload = {
  data: HomeStripCategoryItem[];
};

function buildHomeStripCacheKey(lang: string): string {
  return `cache:categories:home-strip:v2:${lang}`;
}

async function loadHomeCategoryStrip(lang: string): Promise<HomeCategoryStripPayload> {
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
  return result;
}

/**
 * Home page category strip follows `/supersudo/categories` display order (`position`).
 */
export async function getCachedHomeCategoryStrip(
  lang: string,
): Promise<{ result: HomeCategoryStripPayload; cacheStatus: 'HIT' | 'MISS' }> {
  return getCachedJson<HomeCategoryStripPayload>(
    buildHomeStripCacheKey(lang),
    CATEGORIES_CACHE_TTL_SEC,
    () => loadHomeCategoryStrip(lang),
  );
}
