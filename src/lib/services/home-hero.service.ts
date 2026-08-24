import { db } from '@white-shop/db';
import {
  HOME_HERO_SETTING_KEY,
  resolveHomeHeroSettingsForRead,
  type HomeHeroSettings,
} from '@/lib/home-hero';

/**
 * Public storefront loader for homepage hero settings.
 * Missing/empty Settings → converted static banners (no DB write).
 */
export async function getPublicHomeHeroSettings(): Promise<HomeHeroSettings> {
  const setting = await db.settings.findUnique({
    where: { key: HOME_HERO_SETTING_KEY },
    select: { value: true },
  });

  return resolveHomeHeroSettingsForRead(setting?.value ?? null);
}
