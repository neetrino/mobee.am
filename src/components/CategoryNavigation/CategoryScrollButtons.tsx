'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CategoryScrollButtonsProps {
  canScrollLeft: boolean;
  canScrollRight: boolean;
  onScrollLeft: () => void;
  onScrollRight: () => void;
  t: (path: string) => string;
}

/**
 * Scroll navigation buttons for category carousel
 */
export function CategoryScrollButtons({
  canScrollLeft,
  canScrollRight,
  onScrollLeft,
  onScrollRight,
  t,
}: CategoryScrollButtonsProps) {
  return (
    <>
      {/* Left arrow */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.info('[CategoryNavigation] Left arrow clicked, canScrollLeft:', canScrollLeft);
          if (canScrollLeft) {
            onScrollLeft();
          }
        }}
        disabled={!canScrollLeft}
        className={`flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-8 md:-translate-x-12 z-10 w-12 h-12 items-center justify-center bg-transparent hover:bg-transparent transition-all ${
          canScrollLeft 
            ? 'text-gray-900 hover:scale-110 cursor-pointer' 
            : 'text-gray-300 cursor-not-allowed opacity-50'
        }`}
        aria-label={t('products.categoryNavigation.scrollLeft')}
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      {/* Right arrow */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.info('[CategoryNavigation] Right arrow clicked, canScrollRight:', canScrollRight);
          if (canScrollRight) {
            onScrollRight();
          }
        }}
        disabled={!canScrollRight}
        className={`flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-8 md:translate-x-12 z-10 w-12 h-12 items-center justify-center bg-transparent hover:bg-transparent transition-all ${
          canScrollRight 
            ? 'text-gray-900 hover:scale-110 cursor-pointer' 
            : 'text-gray-300 cursor-not-allowed opacity-50'
        }`}
        aria-label={t('products.categoryNavigation.scrollRight')}
      >
        <ChevronRight className="w-6 h-6" />
      </button>
    </>
  );
}




