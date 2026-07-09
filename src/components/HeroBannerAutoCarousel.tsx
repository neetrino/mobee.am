'use client';

import Image from 'next/image';
import { siteMontserrat } from '@/lib/fonts/site-fonts';
import { useTranslation } from '../lib/i18n-client';
import {
  HERO_BANNER_ASPECT_RATIO,
  HERO_BANNER_SLIDE_GAP_PX,
  HERO_BANNER_TRANSITION_MS,
} from './hero-banner-carousel.constants';
import { HERO_BANNER_SLIDES } from './hero-banner-slides.constants';
import { useHeroBannerAutoCarousel } from './useHeroBannerAutoCarousel';

const montserrat = siteMontserrat;

type HeroBannerAutoCarouselProps = {
  className?: string;
};

export function HeroBannerAutoCarousel({ className = '' }: HeroBannerAutoCarouselProps) {
  const { t } = useTranslation();
  const slideCount = HERO_BANNER_SLIDES.length;
  const { activeIndex, trackRef, registerSlideRef, goToSlide, pause, resume } =
    useHeroBannerAutoCarousel({ slideCount });

  return (
    <div
      className={`${className} ${montserrat.className}`}
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocusCapture={pause}
      onBlurCapture={resume}
    >
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ gap: HERO_BANNER_SLIDE_GAP_PX }}
        role="region"
        aria-roledescription="carousel"
        aria-label={t('home.hero_banner_carousel_aria_label')}
      >
        {HERO_BANNER_SLIDES.map((slide, index) => {
          const isActive = index === activeIndex;

          return (
            <div
              key={slide.id}
              ref={(node) => registerSlideRef(index, node)}
              className="w-[88%] shrink-0 snap-center first:ml-[6%] last:mr-[6%] sm:w-[84%] sm:first:ml-[8%] sm:last:mr-[8%]"
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} / ${slideCount}`}
              aria-hidden={!isActive}
            >
              <div
                className="relative overflow-hidden rounded-[30px] bg-[#eceff3] shadow-sm transition-[transform,opacity] ease-out lg:rounded-[40px]"
                style={{
                  aspectRatio: String(HERO_BANNER_ASPECT_RATIO),
                  transitionDuration: `${HERO_BANNER_TRANSITION_MS}ms`,
                  transform: isActive ? 'scale(1)' : 'scale(0.96)',
                  opacity: isActive ? 1 : 0.72,
                }}
              >
                <Image
                  src={slide.imageSrc}
                  alt={slide.alt}
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 1024px) 88vw, 1200px"
                  priority={index === 0}
                />
              </div>
            </div>
          );
        })}
      </div>

      {slideCount > 1 ? (
        <div className="mt-4 flex justify-center gap-2" aria-hidden={false}>
          {HERO_BANNER_SLIDES.map((slide, index) => {
            const isActive = index === activeIndex;

            return (
              <button
                key={slide.id}
                type="button"
                onClick={() => goToSlide(index)}
                className={`h-2 rounded-full transition-all ease-out ${
                  isActive ? 'w-8 bg-[#2db2ff]' : 'w-2 bg-gray-300 hover:bg-gray-400'
                }`}
                style={{ transitionDuration: `${HERO_BANNER_TRANSITION_MS}ms` }}
                aria-label={`${t('home.hero_banner_carousel_go_to_slide')} ${index + 1}`}
                aria-current={isActive ? 'true' : undefined}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
