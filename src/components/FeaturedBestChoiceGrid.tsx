'use client';

import { ProductCard } from './ProductCard';
import type { FeaturedHomeProduct } from './useFeaturedHomeProducts';
import type { LanguageCode } from '../lib/language';
import { t } from '../lib/i18n';

const MOBILE_GRID_LAYOUT =
  'grid grid-cols-2 gap-5 sm:gap-6 md:grid-cols-3 lg:grid-cols-4 justify-items-center';
const BEST_CHOICE_CARD_WIDTH = 'w-[90%] max-w-full';
const BEST_CHOICE_FIRST_CARD_IMAGE = '/images/home/best-choice-first.png';

function BestChoiceSkeleton({ productsPerPage }: { productsPerPage: number }) {
  return (
    <div className={MOBILE_GRID_LAYOUT}>
      {[...Array(productsPerPage)].map((_, i) => (
        <div
          key={i}
          className={`${BEST_CHOICE_CARD_WIDTH} bg-white rounded-lg overflow-hidden animate-pulse`}
        >
          <div className="aspect-square bg-gray-200"></div>
          <div className="p-4 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            <div className="h-5 bg-gray-200 rounded w-1/3"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function BestChoiceCards({
  products,
  productsPerPage,
}: {
  products: FeaturedHomeProduct[];
  productsPerPage: number;
}) {
  return (
    <div className={MOBILE_GRID_LAYOUT}>
      {products.slice(0, productsPerPage).map((product, index) => (
        <div key={product.id} className={BEST_CHOICE_CARD_WIDTH}>
          <ProductCard
            product={index === 0 ? { ...product, image: BEST_CHOICE_FIRST_CARD_IMAGE } : product}
            viewMode="grid-2"
            shiftImageInFrame
            smallerFooterPrice
          />
        </div>
      ))}
    </div>
  );
}

type FeaturedBestChoiceGridProps = {
  language: LanguageCode;
  loading: boolean;
  error: string | null;
  products: FeaturedHomeProduct[];
  productsPerPage: number;
  onRetry: () => void;
};

export function FeaturedBestChoiceGrid({
  language,
  loading,
  error,
  products,
  productsPerPage,
  onRetry,
}: FeaturedBestChoiceGridProps) {
  if (loading) {
    return <BestChoiceSkeleton productsPerPage={productsPerPage} />;
  }
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
        >
          {t(language, 'home.featured_products.tryAgain')}
        </button>
      </div>
    );
  }
  if (products.length > 0) {
    return <BestChoiceCards products={products} productsPerPage={productsPerPage} />;
  }
  return (
    <div className="text-center py-12">
      <p className="text-gray-500">{t(language, 'home.featured_products.noProducts')}</p>
    </div>
  );
}
