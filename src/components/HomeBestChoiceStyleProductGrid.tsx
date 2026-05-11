'use client';

import { useLayoutEffect, useState } from 'react';
import { ProductCard } from './ProductCard';
import type { FeaturedHomeProduct } from './useFeaturedHomeProducts';
import {
  HOME_BEST_CHOICE_MOBILE_CARDS_PER_VIEW_TABLET,
  HOME_BEST_CHOICE_TWO_ROW_COLUMN_SHELL_CLASS,
  HOME_BEST_CHOICE_TWO_ROW_COLUMN_WIDTH_COMPACT_CLASS,
  HOME_BEST_CHOICE_TWO_ROW_COLUMN_WIDTH_DESKTOP_CLASS,
  HOME_BEST_CHOICE_TWO_ROW_COLUMN_WIDTH_IPAD_PRO_CLASS,
  HOME_BEST_CHOICE_TWO_ROW_COLUMN_WIDTH_TABLET_CLASS,
} from './home-best-choice.constants';
import { chunkArray } from '../lib/chunk-array';
import { LAYOUT_DESKTOP_MIN_WIDTH_MEDIA_QUERY } from '../lib/layout-breakpoints.constants';
import { HomeBestChoiceStripArrowRail } from './HomeBestChoiceStripArrowRail';
import {
  useHomeBestChoiceCarouselPageSync,
  type MobileCarouselViewState,
} from './useHomeBestChoiceCarouselPageSync';
import { useIpadProHomeDesktopGrid } from './useIpadProHomeDesktopGrid';

export const HOME_BEST_CHOICE_CARD_WIDTH = 'h-full min-h-0 w-full';

/** Horizontal 2-row strip: container query size + overflow; column widths use `cqi` (see home-best-choice.constants). */
const HOME_BEST_CHOICE_PRODUCT_STRIP =
  '[container-type:inline-size] flex min-w-0 w-full flex-nowrap snap-x snap-mandatory flex-row gap-x-4 overflow-x-auto overscroll-x-contain [touch-action:pan-x_pan-y] [-webkit-overflow-scrolling:touch] scrollbar-hide min-[744px]:max-lg:gap-x-5 lg:gap-x-6';

function useHomeBestChoiceDesktopShellActive(): boolean {
  const [active, setActive] = useState(false);

  useLayoutEffect(() => {
    const mq = window.matchMedia(LAYOUT_DESKTOP_MIN_WIDTH_MEDIA_QUERY);
    const apply = () => setActive(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  return active;
}

type HomeBestChoiceStyleProductGridProps = {
  products: FeaturedHomeProduct[];
  productsPerPage: number;
  /** Drives card density on non-desktop widths (4 vs 6); strip layout uses CSS breakpoints. */
  mobileCardsPerView: number;
  /** Accessible name for the horizontal product strip. */
  mobileCarouselAriaLabel: string;
  scrollPreviousAriaLabel: string;
  scrollNextAriaLabel: string;
  /** Home “Специальные предложения” row — RU desktop add-to-cart pill sizing. */
  specialOffersHomeCard?: boolean;
  /** Reports scroll “page” for {@link HomeMobileSectionTitle} indicators (`lg:hidden`). */
  onMobileCarouselViewChange?: (state: MobileCarouselViewState) => void;
};

function BestChoiceProductCell({
  product,
  specialOffersHomeCard,
  viewMode,
  homeStyle,
}: {
  product: FeaturedHomeProduct;
  specialOffersHomeCard: boolean;
  viewMode: 'grid-2' | 'grid-3';
  homeStyle: boolean;
}) {
  return (
    <div className={HOME_BEST_CHOICE_CARD_WIDTH}>
      <ProductCard
        product={product}
        viewMode={viewMode}
        shiftImageInFrame={homeStyle}
        smallerFooterPrice={homeStyle}
        specialOffersHomeCard={specialOffersHomeCard}
        homeProductGridCard={homeStyle}
      />
    </div>
  );
}

function homeBestChoiceColumnWidthClass(isIpadProDesktopGrid: boolean): string {
  return [
    HOME_BEST_CHOICE_TWO_ROW_COLUMN_WIDTH_COMPACT_CLASS,
    HOME_BEST_CHOICE_TWO_ROW_COLUMN_WIDTH_TABLET_CLASS,
    isIpadProDesktopGrid
      ? HOME_BEST_CHOICE_TWO_ROW_COLUMN_WIDTH_IPAD_PRO_CLASS
      : HOME_BEST_CHOICE_TWO_ROW_COLUMN_WIDTH_DESKTOP_CLASS,
  ].join(' ');
}

export function HomeBestChoiceStyleProductGrid({
  products,
  productsPerPage,
  mobileCardsPerView,
  mobileCarouselAriaLabel,
  scrollPreviousAriaLabel,
  scrollNextAriaLabel,
  specialOffersHomeCard = false,
  onMobileCarouselViewChange,
}: HomeBestChoiceStyleProductGridProps) {
  const isIpadProDesktopGrid = useIpadProHomeDesktopGrid();
  const isDesktopShell = useHomeBestChoiceDesktopShellActive();
  const visible = products.slice(0, productsPerPage);
  const columns = chunkArray(visible, 2);
  const columnWidthClass = homeBestChoiceColumnWidthClass(isIpadProDesktopGrid);
  const cardViewMode: 'grid-2' | 'grid-3' =
    mobileCardsPerView === HOME_BEST_CHOICE_MOBILE_CARDS_PER_VIEW_TABLET ? 'grid-3' : 'grid-2';
  const {
    scrollRef,
    scrollToPrevPage,
    scrollToNextPage,
    canScrollLeft,
    canScrollRight,
    stripOverflows,
  } = useHomeBestChoiceCarouselPageSync(onMobileCarouselViewChange);
  const homeStyle = !isDesktopShell;

  return (
    <div className="relative min-w-0">
      <HomeBestChoiceStripArrowRail
        visible={stripOverflows}
        canScrollLeft={canScrollLeft}
        canScrollRight={canScrollRight}
        onPrevious={scrollToPrevPage}
        onNext={scrollToNextPage}
        previousAriaLabel={scrollPreviousAriaLabel}
        nextAriaLabel={scrollNextAriaLabel}
      />
      <div
        ref={scrollRef}
        className={HOME_BEST_CHOICE_PRODUCT_STRIP}
        role="region"
        aria-roledescription="carousel"
        aria-label={mobileCarouselAriaLabel}
      >
        {columns.map((pair, columnIndex) => (
          <div
            key={`col-${pair[0]?.id ?? columnIndex}`}
            className={`${HOME_BEST_CHOICE_TWO_ROW_COLUMN_SHELL_CLASS} ${columnWidthClass}`}
          >
            {pair.map((product) => (
              <BestChoiceProductCell
                key={product.id}
                product={product}
                specialOffersHomeCard={specialOffersHomeCard}
                viewMode={cardViewMode}
                homeStyle={homeStyle}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonCell() {
  return (
    <div
      className={`${HOME_BEST_CHOICE_CARD_WIDTH} overflow-hidden rounded-lg bg-white animate-pulse`}
    >
      <div className="aspect-square bg-gray-200" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-3/4 rounded bg-gray-200" />
        <div className="h-3 w-1/2 rounded bg-gray-200" />
        <div className="h-5 w-1/3 rounded bg-gray-200" />
      </div>
    </div>
  );
}

export function HomeBestChoiceStyleProductGridSkeleton({
  productsPerPage,
  mobileCarouselAriaLabel,
  onMobileCarouselViewChange,
}: {
  productsPerPage: number;
  mobileCarouselAriaLabel: string;
  onMobileCarouselViewChange?: (state: MobileCarouselViewState) => void;
}) {
  const isIpadProDesktopGrid = useIpadProHomeDesktopGrid();
  const indices = [...Array(productsPerPage)].map((_, i) => i);
  const columns = chunkArray(indices, 2);
  const columnWidthClass = homeBestChoiceColumnWidthClass(isIpadProDesktopGrid);
  const { scrollRef } = useHomeBestChoiceCarouselPageSync(onMobileCarouselViewChange);

  return (
    <div className="relative min-w-0">
      <div
        ref={scrollRef}
        className={HOME_BEST_CHOICE_PRODUCT_STRIP}
        role="region"
        aria-roledescription="carousel"
        aria-label={mobileCarouselAriaLabel}
        aria-busy="true"
      >
        {columns.map((pairIndices, columnIndex) => (
          <div
            key={`sk-col-${columnIndex}`}
            className={`${HOME_BEST_CHOICE_TWO_ROW_COLUMN_SHELL_CLASS} ${columnWidthClass}`}
          >
            {pairIndices.map((i) => (
              <SkeletonCell key={i} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
