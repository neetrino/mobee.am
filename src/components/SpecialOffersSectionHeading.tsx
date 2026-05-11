'use client';

import type { ReactNode } from 'react';
import { Montserrat } from 'next/font/google';
import { useTranslation } from '../lib/i18n-client';
import { HomeMoreCtaPillLink } from './HomeMoreCtaPillLink';
import { HomeMobileSectionTitle } from './HomeMobileSectionTitle';

const montserrat = Montserrat({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '700'],
  display: 'swap',
});

type SpecialOffersSectionHeadingProps = {
  /** Product grid — same card system as “best choice”, placed under the title row. */
  children?: ReactNode;
  syncedCarouselPageIndex?: number;
  syncedCarouselPageCount?: number;
};

/**
 * Row below the home “best choice” grid — same typography/rhythm as {@link FeaturedIntroHeading}.
 */
export function SpecialOffersSectionHeading({
  children,
  syncedCarouselPageIndex,
  syncedCarouselPageCount,
}: SpecialOffersSectionHeadingProps) {
  const { t } = useTranslation();

  return (
    <div
      className={`mt-6 lg:mt-[9rem] ${montserrat.className}`}
      aria-label={t('home.special_offers_heading.title')}
    >
      <div className="hidden flex-col gap-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8 lg:flex">
        <div className="flex min-w-0 flex-col gap-2">
          <h2
            id="special-offers-heading"
            className="text-[30px] font-bold leading-9 text-[#111827]"
          >
            {t('home.special_offers_heading.title')}
          </h2>
          <p className="max-w-[486px] text-base font-normal leading-6 text-[#6b7280]">
            {t('home.special_offers_heading.subtitle')}
          </p>
        </div>
        <HomeMoreCtaPillLink href="/products" variant="cyanPromo" arrowHoverAnimation>
          {t('home.special_offers_heading.cta')}
        </HomeMoreCtaPillLink>
      </div>
      <HomeMobileSectionTitle
        sectionHeadingId="special-offers-heading-mobile"
        title={t('home.mobile_home.specialOffersSectionTitle')}
        syncedCarouselPageIndex={syncedCarouselPageIndex}
        syncedCarouselPageCount={syncedCarouselPageCount}
      />
      {children}
    </div>
  );
}
