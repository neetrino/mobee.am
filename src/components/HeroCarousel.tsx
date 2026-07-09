'use client';

import { siteMontserrat } from '@/lib/fonts/site-fonts';
import { HeroBannerAutoCarousel } from './HeroBannerAutoCarousel';
import { HERO_MOBILE_CONTENT_GUTTERS_CLASS, SITE_CONTENT_GUTTERS_CLASS } from './header-strip-layout';

const montserrat = siteMontserrat;

export function HeroCarousel() {
  return (
    <section className={`bg-white ${montserrat.className}`}>
      <div className={`pb-1 pt-4 sm:pt-5 lg:hidden ${HERO_MOBILE_CONTENT_GUTTERS_CLASS}`}>
        <HeroBannerAutoCarousel />
      </div>

      <div className={`hidden lg:block ${SITE_CONTENT_GUTTERS_CLASS} pb-20 pt-12 xl:pt-24`}>
        <HeroBannerAutoCarousel />
      </div>
    </section>
  );
}
