'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

type HomeDesktopCarouselArrowsProps = {
  canScrollPrev: boolean;
  canScrollNext: boolean;
  onScrollPrev: () => void;
  onScrollNext: () => void;
  prevAriaLabel: string;
  nextAriaLabel: string;
};

const ARROW_BUTTON_BASE =
  'absolute top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-900 shadow-md transition-all duration-150 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 disabled:cursor-default disabled:opacity-0 disabled:pointer-events-none lg:flex';

/**
 * Round prev/next buttons for the desktop home product carousels.
 * Hidden below `lg` (mobile uses native swipe). Buttons fade out when at edges.
 */
export function HomeDesktopCarouselArrows({
  canScrollPrev,
  canScrollNext,
  onScrollPrev,
  onScrollNext,
  prevAriaLabel,
  nextAriaLabel,
}: HomeDesktopCarouselArrowsProps) {
  return (
    <>
      <button
        type="button"
        onClick={onScrollPrev}
        disabled={!canScrollPrev}
        aria-label={prevAriaLabel}
        className={`${ARROW_BUTTON_BASE} left-0 lg:-translate-x-6 xl:-translate-x-12`}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onScrollNext}
        disabled={!canScrollNext}
        aria-label={nextAriaLabel}
        className={`${ARROW_BUTTON_BASE} right-0 lg:translate-x-6 xl:translate-x-12`}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </>
  );
}
