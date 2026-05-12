'use client';

import { useCallback, useEffect, useRef } from 'react';

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
    const pageWidth = el.clientWidth;
    const pageIndex =
      pageWidth > 0
        ? Math.min(pageCount - 1, Math.max(0, Math.round(el.scrollLeft / pageWidth)))
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

    emit();

    const onScroll = () => {
      requestAnimationFrame(emit);
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    const ro = new ResizeObserver(() => emit());
    ro.observe(el);

    return () => {
      el.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
  }, [emit, onViewChange, pageCount]);

  return scrollRef;
}
