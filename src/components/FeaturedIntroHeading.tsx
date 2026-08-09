'use client';

import { siteMontserrat } from '@/lib/fonts/site-fonts';
import { useTranslation } from '../lib/i18n-client';
import { HomeMoreCtaPillLink } from './HomeMoreCtaPillLink';
import { HOME_CURATED_SECTION_DESKTOP_TITLE_CLASS } from './home-best-choice.constants';

const montserrat = siteMontserrat;

/**
 * Desktop title row for the home “best choice” product block.
 * Lives inside {@link HomeProductSections} gutters (no own horizontal padding).
 */
export function FeaturedIntroHeading() {
  const { t } = useTranslation();

  return (
    <div
      className={`hidden lg:block ${montserrat.className}`}
      aria-labelledby="featured-intro-heading"
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
        <div className="flex min-w-0 flex-col gap-2">
          <h2 id="featured-intro-heading" className={HOME_CURATED_SECTION_DESKTOP_TITLE_CLASS}>
            {t('home.featured_intro.title')}
          </h2>
          <p className="max-w-[486px] text-base font-normal leading-6 text-[#6b7280]">
            {t('home.featured_intro.subtitle')}
          </p>
        </div>
        <HomeMoreCtaPillLink href="/products" variant="cyanPromo" arrowHoverAnimation>
          {t('home.featured_intro.cta')}
        </HomeMoreCtaPillLink>
      </div>
    </div>
  );
}
