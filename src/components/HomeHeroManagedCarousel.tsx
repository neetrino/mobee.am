import { siteMontserrat } from '@/lib/fonts/site-fonts';
import type { HeroCarouselSlide } from '@/lib/home-hero';
import { HeroBannerAutoCarousel } from './HeroBannerAutoCarousel';
import { SITE_CONTENT_GUTTERS_CLASS } from './header-strip-layout';

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
    <section className={`bg-gray-50 ${montserrat.className}`}>
      <div className={`pb-1 pt-6 sm:pt-7 lg:hidden ${SITE_CONTENT_GUTTERS_CLASS}`}>
        <HeroBannerAutoCarousel slides={slides} imageVariant="mobile" />
      </div>

      <div className={`hidden lg:block ${SITE_CONTENT_GUTTERS_CLASS} pb-20 pt-8 xl:pt-16`}>
        <HeroBannerAutoCarousel slides={slides} imageVariant="desktop" />
      </div>
    </section>
  );
}
