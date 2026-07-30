'use client';

import { siteMontserrat, siteNotoArmenian } from '@/lib/fonts/site-fonts';
import { useTranslation } from '../lib/i18n-client';
import { FooterPoliciesNav } from './footer/FooterPoliciesNav';
import { SITE_CONTENT_GUTTERS_CLASS } from './header-strip-layout';

const montserrat = siteMontserrat;
const notoArmenian = siteNotoArmenian;

/**
 * Bottom-of-scroll promo card matching Figma mobile (chat + SALE %),
 * with policy links under the card.
 */
export function HomeMobileSaleBanner() {
  const { t, lang } = useTranslation();
  const headlineClass = lang === 'hy' ? notoArmenian.className : montserrat.className;

  return (
    <section className={`lg:hidden ${montserrat.className} bg-white pb-8 pt-2`} aria-labelledby="home-mobile-sale-title">
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

        <div className="mt-10">
          <h3 className="mb-3 text-left text-lg font-semibold leading-6 tracking-[-0.02em] text-[#1D293D]">
            {t('common.footer.policiesHeading')}
          </h3>
          <FooterPoliciesNav layout="mobileHome" />
        </div>
      </div>
    </section>
  );
}
