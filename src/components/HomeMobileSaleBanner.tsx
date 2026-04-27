'use client';

import { Montserrat, Noto_Sans_Armenian } from 'next/font/google';
import { useTranslation } from '../lib/i18n-client';
import { SITE_CONTENT_GUTTERS_CLASS } from './header-strip-layout';

const montserrat = Montserrat({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '800', '900'],
  display: 'swap',
});

const notoArmenian = Noto_Sans_Armenian({
  subsets: ['armenian'],
  weight: ['400', '700', '900'],
  display: 'swap',
});

/**
 * Bottom-of-scroll promo card matching Figma mobile (chat + SALE 50%).
 */
export function HomeMobileSaleBanner() {
  const { t, lang } = useTranslation();
  const headlineClass = lang === 'hy' ? notoArmenian.className : montserrat.className;

  return (
    <section className={`lg:hidden ${montserrat.className} bg-white pb-6 pt-2`} aria-labelledby="home-mobile-sale-title">
      <h2 id="home-mobile-sale-title" className="sr-only">
        {t('home.hero_promo_headline')} {t('home.hero_discount_percent')}
      </h2>
      <div className={SITE_CONTENT_GUTTERS_CLASS}>
        <div className={`overflow-hidden rounded-[30px] bg-[#cde6ff] px-5 pb-7 pt-7 ${headlineClass}`}>
          <p className="max-w-[276px] text-xs font-normal leading-4 text-[#111]">
            <span className="block">{t('home.hero_chat_line1')}</span>
            <span>
              <span className="font-extrabold">{t('home.hero_chat_bold')}</span>
              {t('home.hero_chat_line2')}
            </span>
          </p>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 text-[clamp(2.5rem,14vw,3.875rem)] font-black italic leading-none">
            <span className="text-black">{t('home.hero_promo_headline')}</span>
            <span className="text-[#ff490d]">{t('home.hero_discount_percent')}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
