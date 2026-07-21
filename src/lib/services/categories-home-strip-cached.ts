import { db } from '@white-shop/db';
import type { CategoryTreeNode } from '@/lib/category-nav';
import { pickHomeStripCategories } from '@/lib/categoryHomeStripOrder';
import { pickCategoryTranslation } from '@/lib/pickCategoryTranslation';
import { cacheService } from '@/lib/services/cache.service';

const CACHE_TTL_SECONDS = 300;

export type HomeStripCategoryItem = CategoryTreeNode & {
  position: number;
};

export type HomeCategoryStripPayload = {
  data: HomeStripCategoryItem[];
};

function buildHomeStripCacheKey(lang: string): string {
  // v4: watches strip uses curated local PNG (R2 upload was 128²).
  return `categories:home-strip:v4:${lang}`;
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

  const data = orderedCategories.flatMap((orderedCategory, index): HomeStripCategoryItem[] => {
    const category = categoryById.get(orderedCategory.id);
    if (!category) {
      return [];
    }

    const translation = pickCategoryTranslation(category.translations, lang);
    if (!translation) {
      return [];
    }

    return [
      {
        id: category.id,
        slug: translation.slug,
        title: translation.title,
        fullPath: translation.fullPath,
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
