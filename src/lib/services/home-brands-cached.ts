import { db } from '@white-shop/db';
import { cacheService } from '@/lib/services/cache.service';
import { mapHomeBrandLogos, type HomeBrandLogo } from '@/lib/home/home-brand-logos';

const CACHE_TTL_SECONDS = 300;
const CACHE_KEY_PREFIX = 'home:brands:v1:';

export type HomeBrandsPayload = {
  data: HomeBrandLogo[];
};

function buildHomeBrandsCacheKey(lang: string): string {
  return `${CACHE_KEY_PREFIX}${lang}`;
}

async function loadHomeBrandLogos(lang: string): Promise<HomeBrandLogo[]> {
  const rows = await db.brand.findMany({
    where: {
      published: true,
      deletedAt: null,
      logoUrl: { not: null },
    },
    select: {
      id: true,
      slug: true,
      logoUrl: true,
      translations: {
        select: { locale: true, name: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return mapHomeBrandLogos(rows, lang);
}

/**
 * Cached home brand logos — only published brands with an uploaded logo.
 */
export async function getCachedHomeBrands(
  lang: string,
): Promise<{ result: HomeBrandsPayload; cacheStatus: 'HIT' | 'MISS' }> {
  const cacheKey = buildHomeBrandsCacheKey(lang);
  const cached = await cacheService.get(cacheKey);
  if (cached !== null && cached !== undefined) {
    const result =
      typeof cached === 'string'
        ? (JSON.parse(cached) as HomeBrandsPayload)
        : (cached as HomeBrandsPayload);
    return { result, cacheStatus: 'HIT' };
  }

  const data = await loadHomeBrandLogos(lang);
  const result = { data };
  await cacheService.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(result));
  return { result, cacheStatus: 'MISS' };
}

/** Drops home brand strip cache after admin brand create/update/delete. */
export async function invalidateHomeBrandsCache(): Promise<void> {
  await cacheService.deletePattern(`${CACHE_KEY_PREFIX}*`);
}
