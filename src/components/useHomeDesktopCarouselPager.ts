'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type DesktopCarouselPagerState = {
  pageIndex: number;
  pageCount: number;
  canScrollPrev: boolean;
  canScrollNext: boolean;
};

type UseHomeDesktopCarouselPagerResult = {
  scrollRef: React.RefObject<HTMLDivElement>;
  state: DesktopCarouselPagerState;
  scrollToPrev: () => void;
  scrollToNext: () => void;
  scrollToPage: (pageIndex: number) => void;
};

/**
 * Tracks the visible snap page of the home desktop product carousel and exposes
 * prev/next scroll helpers for arrow buttons. Each "page" is one full container width.
 */
export function useHomeDesktopCarouselPager(
  pageCount: number,
): UseHomeDesktopCarouselPagerResult {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pageIndex, setPageIndex] = useState(0);

  const safePageCount = Math.max(1, pageCount);

  const compute = useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    const pageWidth = el.clientWidth;
    if (pageWidth <= 0) {
      setPageIndex(0);
      return;
    }
    const next = Math.min(
      safePageCount - 1,
      Math.max(0, Math.round(el.scrollLeft / pageWidth)),
    );
    setPageIndex((prev) => (prev === next ? prev : next));
  }, [safePageCount]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }

    compute();

    const onScroll = () => {
      requestAnimationFrame(compute);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    const ro = new ResizeObserver(() => compute());
    ro.observe(el);

    return () => {
      el.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
  }, [compute]);

  const scrollToPage = useCallback(
    (target: number) => {
      const el = scrollRef.current;
      if (!el) {
        return;
      }
      const pageWidth = el.clientWidth;
      if (pageWidth <= 0) {
        return;
      }
      const clamped = Math.min(safePageCount - 1, Math.max(0, target));
      el.scrollTo({ left: clamped * pageWidth, behavior: 'smooth' });
    },
    [safePageCount],
  );

  const scrollToPrev = useCallback(() => {
    scrollToPage(pageIndex - 1);
  }, [pageIndex, scrollToPage]);

  const scrollToNext = useCallback(() => {
    scrollToPage(pageIndex + 1);
  }, [pageIndex, scrollToPage]);

  const state: DesktopCarouselPagerState = {
    pageIndex,
    pageCount: safePageCount,
    canScrollPrev: pageIndex > 0,
    canScrollNext: pageIndex < safePageCount - 1,
  };

  return { scrollRef, state, scrollToPrev, scrollToNext, scrollToPage };
}
