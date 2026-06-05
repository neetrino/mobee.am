import { db } from '@white-shop/db';
import type { CategoryTreeNode } from '@/lib/category-nav';
import { HOME_CATEGORY_STRIP_MAX_POSITION } from '@/lib/constants/home-category-strip.constants';
import { cacheService } from '@/lib/services/cache.service';

const CACHE_TTL_SECONDS = 300;

export type HomeStripCategoryItem = CategoryTreeNode & {
  homeStripPosition: number;
};

export type HomeCategoryStripPayload = {
  data: HomeStripCategoryItem[];
};

function buildHomeStripCacheKey(lang: string): string {
  return `categories:home-strip:${lang}`;
}

/**
 * Categories configured for the home page strip (`homeStripPosition` 1–6).
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
      homeStripPosition: {
        gte: 1,
        lte: HOME_CATEGORY_STRIP_MAX_POSITION,
      },
    },
    include: {
      translations: true,
    },
    orderBy: {
      homeStripPosition: 'asc',
    },
  });

  const data: HomeStripCategoryItem[] = categories
    .map((category) => {
      const translation =
        category.translations.find((tr) => tr.locale === lang) ||
        category.translations[0];
      if (!translation || category.homeStripPosition === null) {
        return null;
      }

      return {
        id: category.id,
        slug: translation.slug,
        title: translation.title,
        fullPath: translation.fullPath,
        media: category.media ?? [],
        children: [],
        homeStripPosition: category.homeStripPosition,
      };
    })
    .filter((item): item is HomeStripCategoryItem => item !== null);

  const result: HomeCategoryStripPayload = { data };
  await cacheService.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(result));
  return { result, cacheStatus: 'MISS' };
}
