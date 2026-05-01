'use client';

import { ProductCard } from './ProductCard';
import type { FeaturedHomeProduct } from './useFeaturedHomeProducts';
import { HOME_BEST_CHOICE_MOBILE_CARDS_PER_VIEW } from './home-best-choice.constants';
import { chunkArray } from '../lib/chunk-array';
import {
  useHomeBestChoiceCarouselPageSync,
  type MobileCarouselViewState,
} from './useHomeBestChoiceCarouselPageSync';

export const HOME_BEST_CHOICE_CARD_WIDTH = 'h-full min-h-0 w-full';

/** Desktop layout for home best-choice rows (hidden below `lg`). */
const HOME_BEST_CHOICE_DESKTOP_GRID =
  'hidden grid-cols-2 gap-2 sm:gap-4 md:grid-cols-3 md:gap-5 lg:grid lg:grid-cols-4 lg:gap-6';

/** Horizontal snap carousel below the `lg` breakpoint. */
const HOME_BEST_CHOICE_MOBILE_CAROUSEL =
  'flex touch-pan-x overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] scrollbar-hide snap-x snap-mandatory lg:hidden';

const HOME_BEST_CHOICE_MOBILE_PAGE = 'w-full min-w-full shrink-0 snap-start';

const HOME_BEST_CHOICE_MOBILE_INNER_GRID = 'grid grid-cols-2 gap-2';

type HomeBestChoiceStyleProductGridProps = {
  products: FeaturedHomeProduct[];
  productsPerPage: number;
  /** Accessible name for the horizontal product strip on small screens. */
  mobileCarouselAriaLabel: string;
  /** Home “Специальные предложения” row — RU desktop add-to-cart pill sizing. */
  specialOffersHomeCard?: boolean;
  /** Reports visible snap page for {@link HomeMobileSectionTitle} indicators. */
  onMobileCarouselViewChange?: (state: MobileCarouselViewState) => void;
};

function BestChoiceProductCell({
  product,
  specialOffersHomeCard,
}: {
  product: FeaturedHomeProduct;
  specialOffersHomeCard: boolean;
}) {
  return (
    <div className={HOME_BEST_CHOICE_CARD_WIDTH}>
      <ProductCard
        product={product}
        viewMode="grid-2"
        shiftImageInFrame
        smallerFooterPrice
        specialOffersHomeCard={specialOffersHomeCard}
        homeProductGridCard
      />
    </div>
  );
}

export function HomeBestChoiceStyleProductGrid({
  products,
  productsPerPage,
  mobileCarouselAriaLabel,
  specialOffersHomeCard = false,
  onMobileCarouselViewChange,
}: HomeBestChoiceStyleProductGridProps) {
  const visible = products.slice(0, productsPerPage);
  const mobilePages = chunkArray(visible, HOME_BEST_CHOICE_MOBILE_CARDS_PER_VIEW);
  const mobilePageCount = mobilePages.length;
  const carouselScrollRef = useHomeBestChoiceCarouselPageSync(
    mobilePageCount,
    onMobileCarouselViewChange,
  );

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
            <div className={HOME_BEST_CHOICE_MOBILE_INNER_GRID}>
              {page.map((product) => (
                <BestChoiceProductCell
                  key={product.id}
                  product={product}
                  specialOffersHomeCard={specialOffersHomeCard}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className={HOME_BEST_CHOICE_DESKTOP_GRID}>
        {visible.map((product) => (
          <BestChoiceProductCell
            key={product.id}
            product={product}
            specialOffersHomeCard={specialOffersHomeCard}
          />
        ))}
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
  mobileCarouselAriaLabel,
  onMobileCarouselViewChange,
}: {
  productsPerPage: number;
  mobileCarouselAriaLabel: string;
  onMobileCarouselViewChange?: (state: MobileCarouselViewState) => void;
}) {
  const indices = [...Array(productsPerPage)].map((_, i) => i);
  const mobilePages = chunkArray(indices, HOME_BEST_CHOICE_MOBILE_CARDS_PER_VIEW);
  const mobilePageCount = mobilePages.length;
  const carouselScrollRef = useHomeBestChoiceCarouselPageSync(
    mobilePageCount,
    onMobileCarouselViewChange,
  );

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
            <div className={HOME_BEST_CHOICE_MOBILE_INNER_GRID}>
              {pageIndices.map((i) => (
                <SkeletonCell key={i} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className={HOME_BEST_CHOICE_DESKTOP_GRID} aria-hidden="true">
        {indices.map((i) => (
          <SkeletonCell key={`sk-d-${i}`} />
        ))}
      </div>
    </>
  );
}
