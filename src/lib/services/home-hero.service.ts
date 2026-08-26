import { db } from '@white-shop/db';
import {
  HOME_HERO_SETTING_KEY,
  resolveHomeHeroSettingsForRead,
  type HomeHeroSettings,
} from '@/lib/home-hero';
import { getCachedJson } from '@/lib/services/read-through-json-cache';
import { HOME_HERO_CACHE_KEY, HOME_HERO_CACHE_TTL_SEC } from '@/lib/cache/public-cache-keys';

async function loadPublicHomeHeroSettings(): Promise<HomeHeroSettings> {
  const setting = await db.settings.findUnique({
    where: { key: HOME_HERO_SETTING_KEY },
    select: { value: true },
  });

  return resolveHomeHeroSettingsForRead(setting?.value ?? null);
}

/**
 * Public storefront loader for homepage hero settings.
 * Missing/empty Settings → converted static banners (no DB write).
 */
export async function getPublicHomeHeroSettings(): Promise<HomeHeroSettings> {
  const { result } = await getCachedJson<HomeHeroSettings>(
    HOME_HERO_CACHE_KEY,
    HOME_HERO_CACHE_TTL_SEC,
    loadPublicHomeHeroSettings,
  );
  return result;
}
