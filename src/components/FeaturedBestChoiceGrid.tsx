'use client';

import {
  HomeBestChoiceStyleProductGrid,
  HomeBestChoiceStyleProductGridSkeleton,
} from './HomeBestChoiceStyleProductGrid';
import {
  HOME_BEST_CHOICE_DESKTOP_PAGE_COLS_DEFAULT,
  HOME_BEST_CHOICE_DESKTOP_PAGE_ROWS_DEFAULT,
} from './home-best-choice.constants';
import type { MobileCarouselViewState } from './useHomeBestChoiceCarouselPageSync';
import type { FeaturedHomeProduct } from './useFeaturedHomeProducts';
import type { LanguageCode } from '../lib/language';
import { t } from '../lib/i18n';

type FeaturedBestChoiceGridProps = {
  language: LanguageCode;
  loading: boolean;
  error: string | null;
  products: FeaturedHomeProduct[];
  productsPerPage: number;
  mobileCardsPerView: number;
  onRetry: () => void;
  onMobileCarouselViewChange?: (state: MobileCarouselViewState) => void;
};

export function FeaturedBestChoiceGrid({
  language,
  loading,
  error,
  products,
  productsPerPage,
  mobileCardsPerView,
  onRetry,
  onMobileCarouselViewChange,
}: FeaturedBestChoiceGridProps) {
  if (loading) {
    return (
      <HomeBestChoiceStyleProductGridSkeleton
        productsPerPage={productsPerPage}
        mobileCardsPerView={mobileCardsPerView}
        mobileCarouselAriaLabel={t(language, 'home.featured_products.carouselAriaLabel')}
        onMobileCarouselViewChange={onMobileCarouselViewChange}
        desktopPageRows={HOME_BEST_CHOICE_DESKTOP_PAGE_ROWS_DEFAULT}
        desktopPageCols={HOME_BEST_CHOICE_DESKTOP_PAGE_COLS_DEFAULT}
      />
    );
  }
  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="mb-4 text-red-600">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded bg-gray-900 px-4 py-2 text-white transition-colors hover:bg-gray-800"
        >
          {t(language, 'home.featured_products.tryAgain')}
        </button>
      </div>
    );
  }
  if (products.length > 0) {
    return (
      <HomeBestChoiceStyleProductGrid
        products={products}
        productsPerPage={productsPerPage}
        mobileCardsPerView={mobileCardsPerView}
        mobileCarouselAriaLabel={t(language, 'home.featured_products.carouselAriaLabel')}
        onMobileCarouselViewChange={onMobileCarouselViewChange}
        desktopPageRows={HOME_BEST_CHOICE_DESKTOP_PAGE_ROWS_DEFAULT}
        desktopPageCols={HOME_BEST_CHOICE_DESKTOP_PAGE_COLS_DEFAULT}
        desktopPrevAriaLabel={t(language, 'home.featured_products.scrollPrevious')}
        desktopNextAriaLabel={t(language, 'home.featured_products.scrollNext')}
      />
    );
  }
  return (
    <div className="py-12 text-center">
      <p className="text-gray-500">{t(language, 'home.featured_products.noProducts')}</p>
    </div>
  );
}
