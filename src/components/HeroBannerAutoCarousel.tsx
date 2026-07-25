'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  startTransition,
  useEffect,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { siteMontserrat } from '@/lib/fonts/site-fonts';
import { warmStorefrontHref } from '@/lib/navigation/storefront-prefetch';
import {
  resolveHomeHeroNavigationTarget,
  type HeroCarouselSlide,
} from '@/lib/home-hero';
import { useTranslation } from '../lib/i18n-client';
import {
  HERO_BANNER_ASPECT_RATIO,
  HERO_BANNER_MOBILE_ASPECT_RATIO,
  HERO_BANNER_SLIDE_GAP_PX,
  HERO_BANNER_TRANSITION_MS,
} from './hero-banner-carousel.constants';
import { useHeroBannerAutoCarousel } from './useHeroBannerAutoCarousel';

const montserrat = siteMontserrat;

type HeroBannerAutoCarouselProps = {
  slides: HeroCarouselSlide[];
  /** Which image URL to show in this carousel instance. */
  imageVariant: 'desktop' | 'mobile';
  className?: string;
};

function resolveInternalHref(href: string | null): string | null {
  const currentOrigin =
    typeof window !== 'undefined' ? window.location.origin : undefined;
  const target = resolveHomeHeroNavigationTarget(href ?? '', { currentOrigin });
  return target?.mode === 'internal' ? target.href : null;
}

function SlideVisual({
  imageUrl,
  priority,
  isActive,
  aspectRatio,
}: {
  imageUrl: string;
  priority: boolean;
  isActive: boolean;
  aspectRatio: number;
}) {
  return (
    // Keep scale/opacity on the outer shell — Safari drops border-radius when
    // transform + overflow:hidden share the same node during compositing.
    <div
      className="transition-[transform,opacity] ease-out motion-reduce:transition-none"
      style={{
        transitionDuration: `${HERO_BANNER_TRANSITION_MS}ms`,
        transform: isActive ? 'scale(1)' : 'scale(0.96)',
        opacity: isActive ? 1 : 0.72,
      }}
    >
      <div
        className="relative overflow-hidden rounded-[24px] bg-[#eceff3] shadow-sm sm:rounded-[30px] lg:rounded-[40px]"
        style={{ aspectRatio: String(aspectRatio) }}
      >
        <Image
          src={imageUrl}
          alt="Mobee homepage banner"
          fill
          className="rounded-[24px] object-cover object-center sm:rounded-[30px] lg:rounded-[40px]"
          sizes="(max-width: 1024px) 100vw, 1400px"
          priority={priority}
          draggable={false}
        />
      </div>
    </div>
  );
}

function HeroBannerSlideLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const warm = () => warmStorefrontHref(router, href);

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    warm();
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <Link
      href={href}
      prefetch
      aria-label="Open featured promotion"
      className="block"
      onMouseEnter={warm}
      onFocus={warm}
      onPointerDown={warm}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}

function wrapSlide(node: ReactNode, href: string | null): ReactNode {
  const currentOrigin =
    typeof window !== 'undefined' ? window.location.origin : undefined;
  const target = resolveHomeHeroNavigationTarget(href ?? '', {
    currentOrigin,
  });

  if (!target) {
    return node;
  }

  if (target.mode === 'external') {
    return (
      <a href={target.href} aria-label="Open featured promotion" className="block">
        {node}
      </a>
    );
  }

  return <HeroBannerSlideLink href={target.href}>{node}</HeroBannerSlideLink>;
}

export function HeroBannerAutoCarousel({
  slides,
  imageVariant,
  className = '',
}: HeroBannerAutoCarouselProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const slideCount = slides.length;
  const { activeIndex, trackRef, registerSlideRef, goToSlide, pause, resume } =
    useHeroBannerAutoCarousel({ slideCount });

  const slideAspectRatio =
    imageVariant === 'mobile' ? HERO_BANNER_MOBILE_ASPECT_RATIO : HERO_BANNER_ASPECT_RATIO;
  /** Mobile: full content width so edges align with featured products (`SITE_CONTENT_GUTTERS`). */
  const slideWidthClass =
    imageVariant === 'mobile'
      ? 'w-full shrink-0 snap-center'
      : 'w-[92%] shrink-0 snap-center first:ml-[4%] last:mr-[4%] sm:w-[90%] sm:first:ml-[5%] sm:last:mr-[5%]';

  // Prefetch active + next slide destinations so click opens instantly.
  useEffect(() => {
    if (slideCount === 0) {
      return;
    }

    const indexes = [activeIndex, (activeIndex + 1) % slideCount];
    for (const index of indexes) {
      const internalHref = resolveInternalHref(slides[index]?.href ?? null);
      if (internalHref) {
        warmStorefrontHref(router, internalHref);
      }
    }
  }, [activeIndex, router, slideCount, slides]);

  if (slideCount === 0) {
    return null;
  }

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
        className="flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain overscroll-y-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ gap: HERO_BANNER_SLIDE_GAP_PX }}
        role="region"
        aria-roledescription="carousel"
        aria-label={t('home.hero_banner_carousel_aria_label')}
      >
        {slides.map((slide, index) => {
          const isActive = index === activeIndex;
          const imageUrl =
            imageVariant === 'mobile' ? slide.mobileImageUrl : slide.desktopImageUrl;

          return (
            <div
              key={slide.id}
              ref={(node) => registerSlideRef(index, node)}
              className={slideWidthClass}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} / ${slideCount}`}
              aria-hidden={!isActive}
            >
              {wrapSlide(
                <SlideVisual
                  imageUrl={imageUrl}
                  priority={index === 0}
                  isActive={isActive}
                  aspectRatio={slideAspectRatio}
                />,
                slide.href,
              )}
            </div>
          );
        })}
      </div>

      {slideCount > 1 ? (
        <div className="mt-7 flex justify-center gap-2" aria-hidden={false}>
          {slides.map((slide, index) => {
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
