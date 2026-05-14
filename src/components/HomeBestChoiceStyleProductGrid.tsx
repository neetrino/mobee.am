'use client';

import { ProductCard } from './ProductCard';
import type { FeaturedHomeProduct } from './useFeaturedHomeProducts';
import {
  HOME_BEST_CHOICE_DESKTOP_PAGE_COLS_DEFAULT,
  HOME_BEST_CHOICE_DESKTOP_PAGE_ROWS_DEFAULT,
  HOME_BEST_CHOICE_MOBILE_CARDS_PER_VIEW_TABLET,
} from './home-best-choice.constants';
import { chunkArray } from '../lib/chunk-array';
import {
  useHomeBestChoiceCarouselPageSync,
  type MobileCarouselViewState,
} from './useHomeBestChoiceCarouselPageSync';
import { useHomeDesktopCarouselPager } from './useHomeDesktopCarouselPager';
import { HomeDesktopCarouselArrows } from './HomeDesktopCarouselArrows';
import { useHomeDesktopCarouselHomeStyle } from './useHomeDesktopCarouselHomeStyle';

export const HOME_BEST_CHOICE_CARD_WIDTH = 'h-full min-h-0 w-full';

/** Horizontal snap carousel below `lg`. */
export const HOME_BEST_CHOICE_MOBILE_CAROUSEL =
  'flex [touch-action:pan-x_pan-y] overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] scrollbar-hide snap-x snap-mandatory lg:hidden';

export const HOME_BEST_CHOICE_MOBILE_PAGE = 'w-full min-w-full shrink-0 snap-start';

/** Horizontal snap carousel for `lg+` (desktop). Each page is one container width. */
const HOME_BEST_CHOICE_DESKTOP_CAROUSEL =
  'hidden lg:flex overflow-x-auto overscroll-x-contain scrollbar-hide snap-x snap-mandatory';

const HOME_BEST_CHOICE_DESKTOP_PAGE = 'w-full min-w-full shrink-0 snap-start';

export function homeBestChoiceMobileInnerGridClass(cardsPerView: number): string {
  return cardsPerView === HOME_BEST_CHOICE_MOBILE_CARDS_PER_VIEW_TABLET
    ? 'grid grid-cols-3 gap-5'
    : 'grid grid-cols-2 gap-4';
}

/**
 * Desktop page grid template — Tailwind classes are static so JIT picks them up.
 */
function homeBestChoiceDesktopInnerGridClass(desktopPageCols: number): string {
  switch (desktopPageCols) {
    case 4:
      return 'grid grid-cols-4 gap-6';
    case 3:
      return 'grid grid-cols-3 gap-6';
    case 2:
    default:
      return 'grid grid-cols-2 gap-6';
  }
}

type HomeBestChoiceStyleProductGridProps = {
  products: FeaturedHomeProduct[];
  productsPerPage: number;
  /** Cards per horizontal snap page below `lg` (4 = 2×2 phone, 6 = 3×2 tablet). */
  mobileCardsPerView: number;
  /** Accessible name for the horizontal product strip on small screens. */
  mobileCarouselAriaLabel: string;
  /** Reports visible snap page for {@link HomeMobileSectionTitle} indicators. */
  onMobileCarouselViewChange?: (state: MobileCarouselViewState) => void;
  /** Desktop carousel page shape (rows × cols). Defaults to 2×2 (4 cards per page). */
  desktopPageRows?: number;
  desktopPageCols?: number;
  /** Accessible labels for the `lg+` prev/next arrow buttons. */
  desktopPrevAriaLabel: string;
  desktopNextAriaLabel: string;
};

function BestChoiceProductCell({
  product,
  viewMode,
  homeStyle,
}: {
  product: FeaturedHomeProduct;
  viewMode: 'grid-2' | 'grid-3';
  /** Mobile / iPad carousel styling; desktop uses default product card chrome. */
  homeStyle: boolean;
}) {
  return (
    <div className={HOME_BEST_CHOICE_CARD_WIDTH}>
      <ProductCard
        product={product}
        viewMode={viewMode}
        shiftImageInFrame={homeStyle}
        smallerFooterPrice={homeStyle}
        homeProductGridCard={homeStyle}
      />
    </div>
  );
}

export function HomeBestChoiceStyleProductGrid({
  products,
  productsPerPage,
  mobileCardsPerView,
  mobileCarouselAriaLabel,
  onMobileCarouselViewChange,
  desktopPageRows = HOME_BEST_CHOICE_DESKTOP_PAGE_ROWS_DEFAULT,
  desktopPageCols = HOME_BEST_CHOICE_DESKTOP_PAGE_COLS_DEFAULT,
  desktopPrevAriaLabel,
  desktopNextAriaLabel,
}: HomeBestChoiceStyleProductGridProps) {
  const desktopHomeStyle = useHomeDesktopCarouselHomeStyle();
  const visible = products.slice(0, productsPerPage);
  const mobilePages = chunkArray(visible, mobileCardsPerView);
  const mobilePageCount = mobilePages.length;
  const cardViewMode: 'grid-2' | 'grid-3' =
    mobileCardsPerView === HOME_BEST_CHOICE_MOBILE_CARDS_PER_VIEW_TABLET ? 'grid-3' : 'grid-2';
  const mobileInnerGridClass = homeBestChoiceMobileInnerGridClass(mobileCardsPerView);
  const carouselScrollRef = useHomeBestChoiceCarouselPageSync(
    mobilePageCount,
    onMobileCarouselViewChange,
  );

  const desktopCardsPerPage = Math.max(1, desktopPageRows * desktopPageCols);
  const desktopPages = chunkArray(visible, desktopCardsPerPage);
  const desktopPageCount = desktopPages.length;
  const desktopInnerGridClass = homeBestChoiceDesktopInnerGridClass(desktopPageCols);
  const {
    scrollRef: desktopScrollRef,
    state: desktopPagerState,
    scrollToPrev,
    scrollToNext,
  } = useHomeDesktopCarouselPager(desktopPageCount);

  return (
    <>
      <div
        ref={carouselScrollRef}
        className={HOME_BEST_CHOICE_MOBILE_CAROUSEL}
        role="region"
        aria-roledescription="carousel"
        aria-label={mobileCarouselAriaLabel}
      >
        {mobilePages.map((page, pageIndex) => (
          <div key={`page-${pageIndex}`} className={HOME_BEST_CHOICE_MOBILE_PAGE}>
            <div className={mobileInnerGridClass}>
              {page.map((product) => (
                <BestChoiceProductCell
                  key={product.id}
                  product={product}
                  viewMode={cardViewMode}
                  homeStyle
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="relative hidden lg:block">
        <div
          ref={desktopScrollRef}
          className={HOME_BEST_CHOICE_DESKTOP_CAROUSEL}
          role="region"
          aria-roledescription="carousel"
          aria-label={mobileCarouselAriaLabel}
        >
          {desktopPages.map((page, pageIndex) => (
            <div key={`d-page-${pageIndex}`} className={HOME_BEST_CHOICE_DESKTOP_PAGE}>
              <div className={desktopInnerGridClass}>
                {page.map((product) => (
                  <BestChoiceProductCell
                    key={product.id}
                    product={product}
                    viewMode="grid-2"
                    homeStyle={desktopHomeStyle}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        {desktopPageCount > 1 && (
          <HomeDesktopCarouselArrows
            canScrollPrev={desktopPagerState.canScrollPrev}
            canScrollNext={desktopPagerState.canScrollNext}
            onScrollPrev={scrollToPrev}
            onScrollNext={scrollToNext}
            prevAriaLabel={desktopPrevAriaLabel}
            nextAriaLabel={desktopNextAriaLabel}
          />
        )}
      </div>
    </>
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
  mobileCardsPerView,
  mobileCarouselAriaLabel,
  onMobileCarouselViewChange,
  desktopPageRows = HOME_BEST_CHOICE_DESKTOP_PAGE_ROWS_DEFAULT,
  desktopPageCols = HOME_BEST_CHOICE_DESKTOP_PAGE_COLS_DEFAULT,
}: {
  productsPerPage: number;
  mobileCardsPerView: number;
  mobileCarouselAriaLabel: string;
  onMobileCarouselViewChange?: (state: MobileCarouselViewState) => void;
  desktopPageRows?: number;
  desktopPageCols?: number;
}) {
  const indices = [...Array(productsPerPage)].map((_, i) => i);
  const mobilePages = chunkArray(indices, mobileCardsPerView);
  const mobilePageCount = mobilePages.length;
  const mobileInnerGridClass = homeBestChoiceMobileInnerGridClass(mobileCardsPerView);
  const carouselScrollRef = useHomeBestChoiceCarouselPageSync(
    mobilePageCount,
    onMobileCarouselViewChange,
  );

  const desktopCardsPerPage = Math.max(1, desktopPageRows * desktopPageCols);
  const desktopPages = chunkArray(indices, desktopCardsPerPage);
  const desktopInnerGridClass = homeBestChoiceDesktopInnerGridClass(desktopPageCols);

  return (
    <>
      <div
        ref={carouselScrollRef}
        className={HOME_BEST_CHOICE_MOBILE_CAROUSEL}
        role="region"
        aria-roledescription="carousel"
        aria-label={mobileCarouselAriaLabel}
        aria-busy="true"
      >
        {mobilePages.map((pageIndices, pageIndex) => (
          <div key={`sk-page-${pageIndex}`} className={HOME_BEST_CHOICE_MOBILE_PAGE}>
            <div className={mobileInnerGridClass}>
              {pageIndices.map((i) => (
                <SkeletonCell key={i} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="relative hidden lg:block" aria-hidden="true">
        <div className={HOME_BEST_CHOICE_DESKTOP_CAROUSEL}>
          {desktopPages.map((pageIndices, pageIndex) => (
            <div key={`sk-d-page-${pageIndex}`} className={HOME_BEST_CHOICE_DESKTOP_PAGE}>
              <div className={desktopInnerGridClass}>
                {pageIndices.map((i) => (
                  <SkeletonCell key={`sk-d-${i}`} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
