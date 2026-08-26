import { Inter, Montserrat, Noto_Sans_Armenian } from 'next/font/google';

/** Root/body Inter — shared with footer. */
export const siteInter = Inter({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  adjustFontFallback: true,
  display: 'swap',
});

/**
 * Single Montserrat instance for storefront chrome (header, hero, sections).
 * Weights union covers all current usages without duplicate font CSS.
 */
export const siteMontserrat = Montserrat({
  subsets: ['latin', 'cyrillic'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  display: 'swap',
});

/** Armenian headlines on home hero/banners. */
export const siteNotoArmenian = Noto_Sans_Armenian({
  subsets: ['armenian'],
  weight: ['400', '700', '900'],
  display: 'swap',
});
