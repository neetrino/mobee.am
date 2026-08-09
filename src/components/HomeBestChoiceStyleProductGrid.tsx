'use client';

import { ProductCard } from './ProductCard';
import { ProductCardListingProvider } from './ProductCardListingContext';
import type { FeaturedHomeProduct } from './useFeaturedHomeProducts';
import {
  HOME_BEST_CHOICE_DESKTOP_PAGE_COLS_DEFAULT,
  HOME_BEST_CHOICE_MOBILE_CARDS_PER_VIEW_TABLET,
  HOME_BEST_CHOICE_MOBILE_CAROUSEL_PAGE_GAP_CLASS,
  HOME_BEST_CHOICE_MOBILE_INNER_GRID_PHONE_CLASS,
  HOME_BEST_CHOICE_MOBILE_INNER_GRID_TABLET_CLASS,
} from './home-best-choice.constants';
import { chunkArray, padChunkToGroupSize } from '../lib/chunk-array';
import {
  useHomeBestChoiceCarouselPageSync,
  type MobileCarouselViewState,
} from './useHomeBestChoiceCarouselPageSync';
import { useHomeDesktopItemCarousel } from './useHomeDesktopItemCarousel';
import { HomeDesktopCarouselArrows } from './HomeDesktopCarouselArrows';
import { useHomeDesktopCarouselHomeStyle } from './useHomeDesktopCarouselHomeStyle';

/** Card cell — stretch to grid row height so every card in a row matches. */
export const HOME_BEST_CHOICE_CARD_WIDTH = 'h-full min-h-0 w-full';

/** Home / shop listing cards — “Add” opens the product page. */
export const LISTING_ADD_BUTTON_NAVIGATES_TO_PRODUCT = {
  addButtonNavigatesToProduct: true,
} as const;

/** Mobile carousel — Figma footer (compact price, round cart). */
export function getHomeCuratedProductCardProps(homeStyle: boolean) {
  return {
    shiftImageInFrame: homeStyle,
    smallerFooterPrice: homeStyle,
    homeProductGridCard: homeStyle,
  } as const;
}

/**
 * Desktop carousel (`lg+`) — same price + add-to-cart pill as home curated rows;
 * optional shifted art on iPad-width desktop only.
 */
export function getHomeCuratedDesktopProductCardProps(homeStyle: boolean) {
  return {
    shiftImageInFrame: homeStyle,
    smallerFooterPrice: false,
    homeProductGridCard: false,
  } as const;
}

/** Horizontal snap scroll shell — add breakpoint visibility in the caller (`lg:hidden`, `xl:hidden`, …). */
export const HOME_BEST_CHOICE_MOBILE_CAROUSEL_SCROLL =
  `flex ${HOME_BEST_CHOICE_MOBILE_CAROUSEL_PAGE_GAP_CLASS} [touch-action:pan-x_pan-y] overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] scrollbar-hide snap-x snap-mandatory`;

/** Horizontal snap carousel below `lg` (home PDP rows: mobile strip hides when desktop grid appears). */
export const HOME_BEST_CHOICE_MOBILE_CAROUSEL =
  `${HOME_BEST_CHOICE_MOBILE_CAROUSEL_SCROLL} lg:hidden`;

export const HOME_BEST_CHOICE_MOBILE_PAGE = 'w-full min-w-full shrink-0 snap-start';

/** Desktop: continuous card strip (scroll one card per arrow). Gap matches former grid `gap-6`. */
const HOME_BEST_CHOICE_DESKTOP_STRIP =
  'hidden lg:flex gap-6 overflow-x-auto overscroll-x-contain scrollbar-hide snap-x snap-mandatory';

/**
 * Card width so `cols` fit in the viewport (gap-6 = 1.5rem between cards).
 * Tailwind classes stay static for JIT.
 */
function homeBestChoiceDesktopCardWidthClass(desktopPageCols: number): string {
  switch (desktopPageCols) {
    case 4:
      return 'w-[calc((100%-4.5rem)/4)]';
    case 3:
      return 'w-[calc((100%-3rem)/3)]';
    case 2:
    default:
      return 'w-[calc((100%-1.5rem)/2)]';
  }
}

export function homeBestChoiceMobileInnerGridClass(cardsPerView: number): string {
  return cardsPerView === HOME_BEST_CHOICE_MOBILE_CARDS_PER_VIEW_TABLET
    ? HOME_BEST_CHOICE_MOBILE_INNER_GRID_TABLET_CLASS
    : HOME_BEST_CHOICE_MOBILE_INNER_GRID_PHONE_CLASS;
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
  /**
   * Kept for call-site compatibility. Desktop is a single-row strip;
   * `desktopPageCols` controls how many cards fit in the viewport.
   */
  desktopPageRows?: number;
  desktopPageCols?: number;
  /** Accessible labels for the `lg+` prev/next arrow buttons. */
  desktopPrevAriaLabel: string;
  desktopNextAriaLabel: string;
};

type HomeCuratedProductCardProps = ReturnType<typeof getHomeCuratedProductCardProps>;

function BestChoiceProductCell({
  product,
  viewMode,
  cardProps,
}: {
  product: FeaturedHomeProduct;
  viewMode: 'grid-2' | 'grid-3';
  cardProps: HomeCuratedProductCardProps;
}) {
  return (
    <div className={HOME_BEST_CHOICE_CARD_WIDTH}>
      <ProductCard
        product={product}
        viewMode={viewMode}
        {...cardProps}
        {...LISTING_ADD_BUTTON_NAVIGATES_TO_PRODUCT}
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

  const desktopCardWidthClass = homeBestChoiceDesktopCardWidthClass(desktopPageCols);
  const {
    scrollRef: desktopScrollRef,
    canScrollPrev,
    canScrollNext,
    scrollByItem,
  } = useHomeDesktopItemCarousel(visible.length);
  const showDesktopArrows = visible.length > desktopPageCols;

  return (
    <ProductCardListingProvider>
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
              {padChunkToGroupSize(page, mobileCardsPerView).map((product, slotIndex) =>
                product ? (
                  <BestChoiceProductCell
                    key={product.id}
                    product={product}
                    viewMode={cardViewMode}
                    cardProps={getHomeCuratedProductCardProps(true)}
                  />
                ) : (
                  <div
                    key={`empty-${pageIndex}-${slotIndex}`}
                    aria-hidden
                    className="min-h-0 min-w-0 h-full"
                  />
                ),
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="relative hidden lg:block">
        <div
          ref={desktopScrollRef}
          className={HOME_BEST_CHOICE_DESKTOP_STRIP}
          role="region"
          aria-roledescription="carousel"
          aria-label={mobileCarouselAriaLabel}
        >
          {visible.map((product) => (
            <div
              key={product.id}
              className={`${desktopCardWidthClass} shrink-0 snap-start`}
            >
              <BestChoiceProductCell
                product={product}
                viewMode="grid-2"
                cardProps={getHomeCuratedDesktopProductCardProps(desktopHomeStyle)}
              />
            </div>
          ))}
        </div>
        {showDesktopArrows && (
          <HomeDesktopCarouselArrows
            canScrollPrev={canScrollPrev}
            canScrollNext={canScrollNext}
            onScrollPrev={() => scrollByItem(-1)}
            onScrollNext={() => scrollByItem(1)}
            prevAriaLabel={desktopPrevAriaLabel}
            nextAriaLabel={desktopNextAriaLabel}
          />
        )}
      </div>
      </>
    </ProductCardListingProvider>
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
  const desktopCardWidthClass = homeBestChoiceDesktopCardWidthClass(desktopPageCols);
  const desktopSkeletonCount = Math.min(productsPerPage, desktopPageCols);

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
              {padChunkToGroupSize(pageIndices, mobileCardsPerView).map((slot, slotIndex) =>
                slot !== undefined ? (
                  <SkeletonCell key={slot} />
                ) : (
                  <div
                    key={`sk-empty-${pageIndex}-${slotIndex}`}
                    aria-hidden
                    className="min-h-0 min-w-0 h-full"
                  />
                ),
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="relative hidden lg:block" aria-hidden="true">
        <div className={HOME_BEST_CHOICE_DESKTOP_STRIP}>
          {Array.from({ length: desktopSkeletonCount }, (_, i) => (
            <div key={`sk-d-${i}`} className={`${desktopCardWidthClass} shrink-0`}>
              <SkeletonCell />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
