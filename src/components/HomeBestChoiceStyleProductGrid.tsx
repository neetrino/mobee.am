'use client';

import { ProductCard } from './ProductCard';
import type { FeaturedHomeProduct } from './useFeaturedHomeProducts';

/** Matches site content gutters rhythm — same as former inline best-choice grid. */
export const HOME_BEST_CHOICE_GRID_LAYOUT =
  'grid grid-cols-2 gap-5 sm:gap-6 md:grid-cols-3 lg:grid-cols-4';

export const HOME_BEST_CHOICE_CARD_WIDTH = 'w-full min-w-0';

/** Hero tile for the first card — identical visual to the “best choice” row. */
export const HOME_BEST_CHOICE_FIRST_CARD_IMAGE = '/images/home/best-choice-first.png';

type HomeBestChoiceStyleProductGridProps = {
  products: FeaturedHomeProduct[];
  productsPerPage: number;
  firstCardHeroImage?: string;
};

export function HomeBestChoiceStyleProductGrid({
  products,
  productsPerPage,
  firstCardHeroImage = HOME_BEST_CHOICE_FIRST_CARD_IMAGE,
}: HomeBestChoiceStyleProductGridProps) {
  return (
    <div className={HOME_BEST_CHOICE_GRID_LAYOUT}>
      {products.slice(0, productsPerPage).map((product, index) => (
        <div key={product.id} className={HOME_BEST_CHOICE_CARD_WIDTH}>
          <ProductCard
            product={
              index === 0 ? { ...product, image: firstCardHeroImage } : product
            }
            viewMode="grid-2"
            shiftImageInFrame
            smallerFooterPrice
          />
        </div>
      ))}
    </div>
  );
}

export function HomeBestChoiceStyleProductGridSkeleton({
  productsPerPage,
}: {
  productsPerPage: number;
}) {
  return (
    <div className={HOME_BEST_CHOICE_GRID_LAYOUT}>
      {[...Array(productsPerPage)].map((_, i) => (
        <div
          key={i}
          className={`${HOME_BEST_CHOICE_CARD_WIDTH} overflow-hidden rounded-lg bg-white animate-pulse`}
        >
          <div className="aspect-square bg-gray-200" />
          <div className="space-y-2 p-4">
            <div className="h-4 w-3/4 rounded bg-gray-200" />
            <div className="h-3 w-1/2 rounded bg-gray-200" />
            <div className="h-5 w-1/3 rounded bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  );
}
