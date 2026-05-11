'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

export type MobileCarouselViewState = {
  pageIndex: number;
  pageCount: number;
};

/** Treat subpixel / rounding noise as flush with an edge. */
const HOME_BEST_CHOICE_STRIP_SCROLL_EDGE_EPSILON_PX = 2;

export type HomeBestChoiceStripScrollBinding = {
  scrollRef: RefObject<HTMLDivElement>;
  scrollToPrevPage: () => void;
  scrollToNextPage: () => void;
  canScrollLeft: boolean;
  canScrollRight: boolean;
  /** Content wider than the scrollport — show prev/next controls. */
  stripOverflows: boolean;
};

/**
 * Tracks horizontal “screenfuls” for the home best-choice 2-row scroll strip and optional arrow controls.
 */
export function useHomeBestChoiceCarouselPageSync(
  onViewChange?: (state: MobileCarouselViewState) => void,
): HomeBestChoiceStripScrollBinding {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [stripOverflows, setStripOverflows] = useState(false);

  const syncFromDom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }

    const viewport = el.clientWidth;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    const overflows = maxScroll > HOME_BEST_CHOICE_STRIP_SCROLL_EDGE_EPSILON_PX;

    let nextLeft = false;
    let nextRight = false;
    if (overflows) {
      nextLeft = el.scrollLeft > HOME_BEST_CHOICE_STRIP_SCROLL_EDGE_EPSILON_PX;
      nextRight = el.scrollLeft < maxScroll - HOME_BEST_CHOICE_STRIP_SCROLL_EDGE_EPSILON_PX;
    }

    setCanScrollLeft((prev) => (prev === nextLeft ? prev : nextLeft));
    setCanScrollRight((prev) => (prev === nextRight ? prev : nextRight));
    setStripOverflows((prev) => (prev === overflows ? prev : overflows));

    if (onViewChange && viewport > 0) {
      const pageCount = Math.max(1, Math.ceil(el.scrollWidth / viewport));
      const pageIndex = Math.min(
        pageCount - 1,
        Math.max(0, Math.round(el.scrollLeft / viewport)),
      );
      onViewChange({ pageIndex, pageCount });
    }
  }, [onViewChange]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }

    const scheduleSync = () => {
      requestAnimationFrame(() => {
        syncFromDom();
      });
    };

    scheduleSync();
    el.addEventListener('scroll', scheduleSync, { passive: true });
    const ro = new ResizeObserver(scheduleSync);
    ro.observe(el);

    return () => {
      el.removeEventListener('scroll', scheduleSync);
      ro.disconnect();
    };
  }, [syncFromDom]);

  const scrollToPrevPage = useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    el.scrollBy({ left: -el.clientWidth, behavior: 'smooth' });
  }, []);

  const scrollToNextPage = useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    el.scrollBy({ left: el.clientWidth, behavior: 'smooth' });
  }, []);

  return {
    scrollRef: scrollRef as RefObject<HTMLDivElement>,
    scrollToPrevPage,
    scrollToNextPage,
    canScrollLeft,
    canScrollRight,
    stripOverflows,
  };
}
