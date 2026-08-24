'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const SCROLL_EDGE_TOLERANCE_PX = 2;

type UseHomeDesktopItemCarouselResult = {
  scrollRef: React.RefObject<HTMLDivElement>;
  canScrollPrev: boolean;
  canScrollNext: boolean;
  scrollByItem: (direction: -1 | 1) => void;
};

/**
 * Desktop home product strip: continuous horizontal scroll, one card per arrow click.
 */
export function useHomeDesktopItemCarousel(
  itemCount: number,
): UseHomeDesktopItemCarouselResult {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const updateScrollState = useCallback(() => {
    const element = scrollRef.current;
    if (!element) {
      return;
    }
    setCanScrollPrev(element.scrollLeft > SCROLL_EDGE_TOLERANCE_PX);
    setCanScrollNext(
      element.scrollLeft + element.clientWidth <
        element.scrollWidth - SCROLL_EDGE_TOLERANCE_PX,
    );
  }, []);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) {
      return;
    }
    updateScrollState();
    element.addEventListener('scroll', updateScrollState, { passive: true });
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(element);
    return () => {
      element.removeEventListener('scroll', updateScrollState);
      resizeObserver.disconnect();
    };
  }, [itemCount, updateScrollState]);

  const scrollByItem = useCallback((direction: -1 | 1) => {
    const element = scrollRef.current;
    const firstItem = element?.children.item(0);
    const secondItem = element?.children.item(1);
    if (
      !element ||
      !(firstItem instanceof HTMLElement) ||
      !(secondItem instanceof HTMLElement)
    ) {
      return;
    }
    const itemStep = secondItem.offsetLeft - firstItem.offsetLeft;
    if (itemStep <= 0) {
      return;
    }
    element.scrollBy({ left: direction * itemStep, behavior: 'smooth' });
  }, []);

  return { scrollRef, canScrollPrev, canScrollNext, scrollByItem };
}
