'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { HERO_BANNER_AUTO_INTERVAL_MS } from './hero-banner-carousel.constants';

type UseHeroBannerAutoCarouselOptions = {
  slideCount: number;
  intervalMs?: number;
};

export type UseHeroBannerAutoCarouselResult = {
  activeIndex: number;
  trackRef: React.RefObject<HTMLDivElement>;
  registerSlideRef: (index: number, node: HTMLDivElement | null) => void;
  goToSlide: (index: number) => void;
  pause: () => void;
  resume: () => void;
};

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Auto-advancing index + scroll sync for the home hero peek carousel.
 */
export function useHeroBannerAutoCarousel({
  slideCount,
  intervalMs = HERO_BANNER_AUTO_INTERVAL_MS,
}: UseHeroBannerAutoCarouselOptions): UseHeroBannerAutoCarouselResult {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

  const registerSlideRef = useCallback((index: number, node: HTMLDivElement | null) => {
    slideRefs.current[index] = node;
  }, []);

  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = 'smooth') => {
    const slide = slideRefs.current[index];
    if (!slide) {
      return;
    }
    slide.scrollIntoView({
      behavior,
      block: 'nearest',
      inline: 'center',
    });
  }, []);

  const goToSlide = useCallback(
    (index: number) => {
      if (slideCount < 1) {
        return;
      }
      const nextIndex = ((index % slideCount) + slideCount) % slideCount;
      setActiveIndex(nextIndex);
      scrollToIndex(nextIndex);
    },
    [scrollToIndex, slideCount],
  );

  const pause = useCallback(() => setIsPaused(true), []);
  const resume = useCallback(() => setIsPaused(false), []);

  useEffect(() => {
    slideRefs.current = slideRefs.current.slice(0, slideCount);
  }, [slideCount]);

  useEffect(() => {
    if (slideCount < 1) {
      return;
    }
    scrollToIndex(0, 'auto');
  }, [scrollToIndex, slideCount]);

  useEffect(() => {
    if (slideCount < 2 || isPaused || prefersReducedMotion()) {
      return;
    }

    const timerId = window.setInterval(() => {
      setActiveIndex((current) => {
        const nextIndex = (current + 1) % slideCount;
        scrollToIndex(nextIndex);
        return nextIndex;
      });
    }, intervalMs);

    return () => window.clearInterval(timerId);
  }, [intervalMs, isPaused, scrollToIndex, slideCount]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || slideCount < 1) {
      return;
    }

    const syncActiveIndexFromScroll = () => {
      const trackRect = track.getBoundingClientRect();
      const trackCenter = trackRect.left + trackRect.width / 2;

      let closestIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;

      slideRefs.current.forEach((slide, index) => {
        if (!slide) {
          return;
        }
        const slideRect = slide.getBoundingClientRect();
        const slideCenter = slideRect.left + slideRect.width / 2;
        const distance = Math.abs(slideCenter - trackCenter);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      setActiveIndex(closestIndex);
    };

    track.addEventListener('scroll', syncActiveIndexFromScroll, { passive: true });
    return () => track.removeEventListener('scroll', syncActiveIndexFromScroll);
  }, [slideCount]);

  return {
    activeIndex,
    trackRef,
    registerSlideRef,
    goToSlide,
    pause,
    resume,
  };
}
