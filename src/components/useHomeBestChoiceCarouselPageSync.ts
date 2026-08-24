'use client';

import { useCallback, useEffect, useRef } from 'react';

function getMobileCarouselPageStride(scrollElement: HTMLElement): number {
  const pageWidth = scrollElement.clientWidth;
  if (pageWidth <= 0) {
    return 0;
  }

  const gapValue = getComputedStyle(scrollElement).columnGap || getComputedStyle(scrollElement).gap;
  const gapPx = gapValue ? Number.parseFloat(gapValue) : 0;
  return pageWidth + gapPx;
}

export type MobileCarouselViewState = {
  pageIndex: number;
  pageCount: number;
};

/**
 * Tracks which full-width snap page of the home best-choice mobile carousel is visible.
 */
export function useHomeBestChoiceCarouselPageSync(
  pageCount: number,
  onViewChange?: (state: MobileCarouselViewState) => void,
) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const emit = useCallback(() => {
    if (!onViewChange || pageCount < 1) {
      return;
    }
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    const pageStride = getMobileCarouselPageStride(el);
    const pageIndex =
      pageStride > 0
        ? Math.min(pageCount - 1, Math.max(0, Math.round(el.scrollLeft / pageStride)))
        : 0;
    onViewChange({ pageIndex, pageCount });
  }, [onViewChange, pageCount]);

  useEffect(() => {
    if (!onViewChange || pageCount < 1) {
      return;
    }
    const el = scrollRef.current;
    if (!el) {
      return;
    }

    let cancelled = false;
    const scheduleEmit = () => {
      requestAnimationFrame(() => {
        if (!cancelled) {
          emit();
        }
      });
    };

    scheduleEmit();

    const onScroll = () => {
      scheduleEmit();
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    const ro = new ResizeObserver(() => {
      scheduleEmit();
    });
    ro.observe(el);

    return () => {
      cancelled = true;
      el.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
  }, [emit, onViewChange, pageCount]);

  return scrollRef;
}
