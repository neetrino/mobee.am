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
 * Auto-advancing hero peek carousel with native horizontal scroll (track.scrollTo only — never scrollIntoView).
 */
export function useHeroBannerAutoCarousel({
  slideCount,
  intervalMs = HERO_BANNER_AUTO_INTERVAL_MS,
}: UseHeroBannerAutoCarouselOptions): UseHeroBannerAutoCarouselResult {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isInView, setIsInView] = useState(true);
  const trackRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isUserScrollingRef = useRef(false);
  const userScrollResetTimerRef = useRef<number | null>(null);

  const registerSlideRef = useCallback((index: number, node: HTMLDivElement | null) => {
    slideRefs.current[index] = node;
  }, []);

  const scrollTrackToIndex = useCallback((index: number, behavior: ScrollBehavior = 'smooth') => {
    const track = trackRef.current;
    const slide = slideRefs.current[index];
    if (!track || !slide) {
      return;
    }

    const targetLeft = slide.offsetLeft - (track.clientWidth - slide.offsetWidth) / 2;
    const maxScrollLeft = track.scrollWidth - track.clientWidth;
    const clampedLeft = Math.max(0, Math.min(maxScrollLeft, targetLeft));

    track.scrollTo({
      left: clampedLeft,
      behavior,
    });
  }, []);

  const goToSlide = useCallback(
    (index: number) => {
      if (slideCount < 1) {
        return;
      }
      const nextIndex = ((index % slideCount) + slideCount) % slideCount;
      setActiveIndex(nextIndex);
      scrollTrackToIndex(nextIndex);
    },
    [scrollTrackToIndex, slideCount],
  );

  const pause = useCallback(() => setIsPaused(true), []);

  const resume = useCallback(() => setIsPaused(false), []);

  const markUserScrolling = useCallback(() => {
    isUserScrollingRef.current = true;
    setIsPaused(true);

    if (userScrollResetTimerRef.current !== null) {
      window.clearTimeout(userScrollResetTimerRef.current);
    }

    userScrollResetTimerRef.current = window.setTimeout(() => {
      isUserScrollingRef.current = false;
      setIsPaused(false);
      userScrollResetTimerRef.current = null;
    }, 800);
  }, []);

  useEffect(() => {
    slideRefs.current = slideRefs.current.slice(0, slideCount);
  }, [slideCount]);

  useEffect(() => {
    if (slideCount < 1) {
      return;
    }
    scrollTrackToIndex(0, 'auto');
  }, [scrollTrackToIndex, slideCount]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.2 },
    );

    observer.observe(track);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (slideCount < 2 || isPaused || !isInView || prefersReducedMotion()) {
      return;
    }

    const timerId = window.setInterval(() => {
      if (isUserScrollingRef.current) {
        return;
      }

      setActiveIndex((current) => {
        const nextIndex = (current + 1) % slideCount;
        scrollTrackToIndex(nextIndex);
        return nextIndex;
      });
    }, intervalMs);

    return () => window.clearInterval(timerId);
  }, [intervalMs, isInView, isPaused, scrollTrackToIndex, slideCount]);

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

    const onScroll = () => {
      markUserScrolling();
      syncActiveIndexFromScroll();
    };

    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
        return;
      }

      event.preventDefault();
      window.scrollBy({
        top: event.deltaY,
        left: 0,
        behavior: 'auto',
      });
    };

    track.addEventListener('scroll', onScroll, { passive: true });
    track.addEventListener('wheel', onWheel, { passive: false });
    track.addEventListener('touchstart', markUserScrolling, { passive: true });

    return () => {
      track.removeEventListener('scroll', onScroll);
      track.removeEventListener('wheel', onWheel);
      track.removeEventListener('touchstart', markUserScrolling);

      if (userScrollResetTimerRef.current !== null) {
        window.clearTimeout(userScrollResetTimerRef.current);
      }
    };
  }, [markUserScrolling, slideCount]);

  return {
    activeIndex,
    trackRef,
    registerSlideRef,
    goToSlide,
    pause,
    resume,
  };
}
