'use client';

import { useCallback, useEffect, useRef } from 'react';

export type MobileCarouselViewState = {
  pageIndex: number;
  pageCount: number;
};

/**
 * Tracks horizontal “screenfuls” for the home best-choice 2-row scroll strip (scrollWidth ÷ viewport).
 */
export function useHomeBestChoiceCarouselPageSync(
  onViewChange?: (state: MobileCarouselViewState) => void,
) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const emit = useCallback(() => {
    if (!onViewChange) {
      return;
    }
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    const viewport = el.clientWidth;
    if (viewport <= 0) {
      return;
    }
    const pageCount = Math.max(1, Math.ceil(el.scrollWidth / viewport));
    const pageIndex = Math.min(
      pageCount - 1,
      Math.max(0, Math.round(el.scrollLeft / viewport)),
    );
    onViewChange({ pageIndex, pageCount });
  }, [onViewChange]);

  useEffect(() => {
    if (!onViewChange) {
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
  }, [emit, onViewChange]);

  return scrollRef;
}
