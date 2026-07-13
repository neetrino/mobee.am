'use client';

import { siteMontserrat } from '@/lib/fonts/site-fonts';
import {
  convertStaticHeroBannerSlides,
  toHeroCarouselSlides,
} from '@/lib/home-hero';
import { HeroBannerAutoCarousel } from './HeroBannerAutoCarousel';
import { HERO_BANNER_SLIDES } from './hero-banner-slides.constants';
import { HERO_MOBILE_CONTENT_GUTTERS_CLASS, SITE_CONTENT_GUTTERS_CLASS } from './header-strip-layout';

const montserrat = siteMontserrat;

const FALLBACK_SLIDES = toHeroCarouselSlides({
  slides: convertStaticHeroBannerSlides(HERO_BANNER_SLIDES),
});

/**
 * Static homepage hero fallback when no managed Settings slides are configured.
 */
export function HeroCarousel() {
  return (
    <section className={`bg-white ${montserrat.className}`}>
      <div className={`pb-1 pt-2 sm:pt-3 lg:hidden ${HERO_MOBILE_CONTENT_GUTTERS_CLASS}`}>
        <HeroBannerAutoCarousel slides={FALLBACK_SLIDES} imageVariant="mobile" />
      </div>

      <div className={`hidden lg:block ${SITE_CONTENT_GUTTERS_CLASS} pb-20 pt-8 xl:pt-16`}>
        <HeroBannerAutoCarousel slides={FALLBACK_SLIDES} imageVariant="desktop" />
      </div>
    </section>
  );
}
