import { siteMontserrat } from '@/lib/fonts/site-fonts';
import type { HeroCarouselSlide } from '@/lib/home-hero';
import { HeroBannerAutoCarousel } from './HeroBannerAutoCarousel';
import { HERO_MOBILE_CONTENT_GUTTERS_CLASS, SITE_CONTENT_GUTTERS_CLASS } from './header-strip-layout';

const montserrat = siteMontserrat;

type HomeHeroManagedCarouselProps = {
  slides: HeroCarouselSlide[];
};

/**
 * Admin-managed homepage image carousel (desktop/mobile assets + per-slide CTA).
 * Separate from the static promo {@link HeroCarousel}.
 */
export function HomeHeroManagedCarousel({ slides }: HomeHeroManagedCarouselProps) {
  if (slides.length === 0) {
    return null;
  }

  return (
    <section className={`bg-white ${montserrat.className}`}>
      <div className={`pb-1 pt-4 sm:pt-5 lg:hidden ${HERO_MOBILE_CONTENT_GUTTERS_CLASS}`}>
        <HeroBannerAutoCarousel slides={slides} imageVariant="mobile" />
      </div>

      <div className={`hidden lg:block ${SITE_CONTENT_GUTTERS_CLASS} pb-20 pt-12 xl:pt-24`}>
        <HeroBannerAutoCarousel slides={slides} imageVariant="desktop" />
      </div>
    </section>
  );
}
