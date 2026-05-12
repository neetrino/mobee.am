'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

type HomeBestChoiceStripArrowRailProps = {
  visible: boolean;
  canScrollLeft: boolean;
  canScrollRight: boolean;
  onPrevious: () => void;
  onNext: () => void;
  previousAriaLabel: string;
  nextAriaLabel: string;
};

const ARROW_BUTTON_BASE_CLASS =
  'absolute top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200/90 bg-white/95 text-gray-900 shadow-md transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2db2ff] disabled:cursor-not-allowed disabled:opacity-35 motion-reduce:transition-none';

/**
 * Left/right controls for the home best-choice horizontal product strip.
 */
export function HomeBestChoiceStripArrowRail({
  visible,
  canScrollLeft,
  canScrollRight,
  onPrevious,
  onNext,
  previousAriaLabel,
  nextAriaLabel,
}: HomeBestChoiceStripArrowRailProps) {
  if (!visible) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className={`${ARROW_BUTTON_BASE_CLASS} left-1 sm:left-2`}
        aria-label={previousAriaLabel}
        disabled={!canScrollLeft}
        onClick={onPrevious}
      >
        <ChevronLeft className="h-5 w-5 shrink-0" aria-hidden strokeWidth={2.25} />
      </button>
      <button
        type="button"
        className={`${ARROW_BUTTON_BASE_CLASS} right-1 sm:right-2`}
        aria-label={nextAriaLabel}
        disabled={!canScrollRight}
        onClick={onNext}
      >
        <ChevronRight className="h-5 w-5 shrink-0" aria-hidden strokeWidth={2.25} />
      </button>
    </>
  );
}
