'use client';

import { useState, type ReactNode } from 'react';
import { Montserrat } from 'next/font/google';
import { useTranslation } from '../lib/i18n-client';
import { HomeCtaPillArrowIcon, HomeMoreCtaPillLink } from './HomeMoreCtaPillLink';
import { HomeMobileSectionTitle } from './HomeMobileSectionTitle';

const montserrat = Montserrat({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '700'],
  display: 'swap',
});

type CtaArrowMotion = 'idle' | 'hoverIn' | 'hoverOut';

function getCtaArrowMotionClass(motion: CtaArrowMotion): string {
  if (motion === 'hoverIn') {
    return 'animate-cta-arrow-nudge-in';
  }
  if (motion === 'hoverOut') {
    return 'animate-cta-arrow-nudge-out';
  }
  return '';
}

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
  const [ctaArrowMotion, setCtaArrowMotion] = useState<CtaArrowMotion>('idle');
  const [ctaArrowMotionKey, setCtaArrowMotionKey] = useState(0);

  function handleCtaPointerEnter() {
    setCtaArrowMotion('hoverIn');
    setCtaArrowMotionKey((key) => key + 1);
  }

  function handleCtaPointerLeave() {
    setCtaArrowMotion('hoverOut');
    setCtaArrowMotionKey((key) => key + 1);
  }

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
        <HomeMoreCtaPillLink
          href="/products"
          variant="cyanPromo"
          onPointerEnter={handleCtaPointerEnter}
          onPointerLeave={handleCtaPointerLeave}
          circleContent={
            <span
              key={ctaArrowMotionKey}
              className={`inline-flex items-center justify-center ${getCtaArrowMotionClass(ctaArrowMotion)}`}
            >
              <HomeCtaPillArrowIcon className="size-5 shrink-0 text-white" />
            </span>
          }
        >
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
