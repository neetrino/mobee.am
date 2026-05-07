'use client';

import { Montserrat } from 'next/font/google';
import { useTranslation } from '../lib/i18n-client';
import { HomeMoreCtaPillLink } from './HomeMoreCtaPillLink';
import { SITE_CONTENT_GUTTERS_CLASS } from './header-strip-layout';

const montserrat = Montserrat({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '700'],
  display: 'swap',
});

export function FeaturedIntroHeading() {
  const { t } = useTranslation();

  return (
    <section
      className={`hidden bg-white lg:block ${montserrat.className}`}
      aria-labelledby="featured-intro-heading"
    >
      <div className={`${SITE_CONTENT_GUTTERS_CLASS} pb-0 pt-6`}>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          <div className="flex min-w-0 flex-col gap-2">
            <h2
              id="featured-intro-heading"
              className="text-[30px] font-bold leading-9 text-[#111827]"
            >
              {t('home.featured_intro.title')}
            </h2>
            <p className="max-w-[486px] text-base font-normal leading-6 text-[#6b7280]">
              {t('home.featured_intro.subtitle')}
            </p>
          </div>
          <HomeMoreCtaPillLink href="/products" variant="cyanPromo">
            {t('home.featured_intro.cta')}
          </HomeMoreCtaPillLink>
        </div>
      </div>
    </section>
  );
}
