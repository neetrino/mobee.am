'use client';

import { useCallback } from 'react';
import { FeaturedBestChoiceGrid } from './FeaturedBestChoiceGrid';
import { SpecialOffersProductGrid } from './SpecialOffersProductGrid';
import { SpecialOffersSectionHeading } from './SpecialOffersSectionHeading';
import { WhyChooseUsSection } from './WhyChooseUsSection';
import { HomeMobileSectionTitle } from './HomeMobileSectionTitle';
import { HomeMobileSaleBanner } from './HomeMobileSaleBanner';
import { SITE_CONTENT_GUTTERS_CLASS } from './header-strip-layout';
import { t } from '../lib/i18n';
import { FEATURED_HOME_FILTER_DEFAULT, useFeaturedHomeProducts } from './useFeaturedHomeProducts';
import {
  SPECIAL_OFFERS_HOME_FILTER_DEFAULT,
  useSpecialOffersHomeProducts,
} from './useSpecialOffersHomeProducts';
import { useHomeProductSectionsCarousels } from './useHomeProductSectionsCarousels';
import { useHomeBestChoiceMobileCardsPerView } from './useHomeBestChoiceMobileCardsPerView';
import type { LanguageCode } from '../lib/language';
import type { FeaturedHomeProduct } from './useFeaturedHomeProducts';
import type { MobileCarouselViewState } from './useHomeBestChoiceCarouselPageSync';

type HomeFeaturedCarouselSectionProps = {
  language: LanguageCode;
  featuredCarousel: MobileCarouselViewState;
  loading: boolean;
  error: string | null;
  products: FeaturedHomeProduct[];
  productsPerPage: number;
  mobileCardsPerView: number;
  onRetry: () => void;
  onFeaturedCarouselViewChange: (state: MobileCarouselViewState) => void;
};

function HomeFeaturedCarouselSection({
  language,
  featuredCarousel,
  loading,
  error,
  products,
  productsPerPage,
  mobileCardsPerView,
  onRetry,
  onFeaturedCarouselViewChange,
}: HomeFeaturedCarouselSectionProps) {
  return (
    <>
      <HomeMobileSectionTitle
        sectionHeadingId="home-featured-heading-mobile"
        title={t(language, 'home.mobile_home.featuredSectionTitle')}
        syncedCarouselPageIndex={featuredCarousel.pageIndex}
        syncedCarouselPageCount={featuredCarousel.pageCount}
      />
      <div className="mt-5 lg:mt-0">
        <FeaturedBestChoiceGrid
          language={language}
          loading={loading}
          error={error}
          products={products}
          productsPerPage={productsPerPage}
          mobileCardsPerView={mobileCardsPerView}
          onRetry={onRetry}
          onMobileCarouselViewChange={onFeaturedCarouselViewChange}
        />
      </div>
    </>
  );
}

type HomeSpecialOffersCarouselSectionProps = {
  specialOffersLanguage: LanguageCode;
  specialOffersCarousel: MobileCarouselViewState;
  specialOffersLoading: boolean;
  specialOffersError: string | null;
  specialOffersProducts: FeaturedHomeProduct[];
  specialOffersProductsPerPage: number;
  mobileCardsPerView: number;
  onRetrySpecialOffers: () => void;
  onSpecialOffersCarouselViewChange: (state: MobileCarouselViewState) => void;
};

function HomeSpecialOffersCarouselSection({
  specialOffersLanguage,
  specialOffersCarousel,
  specialOffersLoading,
  specialOffersError,
  specialOffersProducts,
  specialOffersProductsPerPage,
  mobileCardsPerView,
  onRetrySpecialOffers,
  onSpecialOffersCarouselViewChange,
}: HomeSpecialOffersCarouselSectionProps) {
  return (
    <SpecialOffersSectionHeading
      syncedCarouselPageIndex={specialOffersCarousel.pageIndex}
      syncedCarouselPageCount={specialOffersCarousel.pageCount}
    >
      <div className="mt-4 lg:mt-[7.5rem]">
        <SpecialOffersProductGrid
          language={specialOffersLanguage}
          loading={specialOffersLoading}
          error={specialOffersError}
          products={specialOffersProducts}
          productsPerPage={specialOffersProductsPerPage}
          mobileCardsPerView={mobileCardsPerView}
          onRetry={onRetrySpecialOffers}
          onMobileCarouselViewChange={onSpecialOffersCarouselViewChange}
        />
      </div>
    </SpecialOffersSectionHeading>
  );
}

type HomeProductSectionsBodyProps = {
  language: LanguageCode;
  products: FeaturedHomeProduct[];
  loading: boolean;
  error: string | null;
  productsPerPage: number;
  onRetry: () => void;
  specialOffersLanguage: LanguageCode;
  specialOffersProducts: FeaturedHomeProduct[];
  specialOffersLoading: boolean;
  specialOffersError: string | null;
  specialOffersProductsPerPage: number;
  onRetrySpecialOffers: () => void;
  featuredCarousel: MobileCarouselViewState;
  specialOffersCarousel: MobileCarouselViewState;
  onFeaturedCarouselViewChange: (state: MobileCarouselViewState) => void;
  onSpecialOffersCarouselViewChange: (state: MobileCarouselViewState) => void;
  mobileCardsPerView: number;
};

function HomeProductSectionsBody(props: HomeProductSectionsBodyProps) {
  const { language, ...rest } = props;
  return (
    <div className={SITE_CONTENT_GUTTERS_CLASS}>
      <h2 id="home-product-sections" className="sr-only">
        {t(language, 'home.featured_products.title')}
      </h2>
      <HomeFeaturedCarouselSection
        language={language}
        featuredCarousel={rest.featuredCarousel}
        loading={rest.loading}
        error={rest.error}
        products={rest.products}
        productsPerPage={rest.productsPerPage}
        mobileCardsPerView={rest.mobileCardsPerView}
        onRetry={rest.onRetry}
        onFeaturedCarouselViewChange={rest.onFeaturedCarouselViewChange}
      />
      <HomeSpecialOffersCarouselSection
        specialOffersLanguage={rest.specialOffersLanguage}
        specialOffersCarousel={rest.specialOffersCarousel}
        specialOffersLoading={rest.specialOffersLoading}
        specialOffersError={rest.specialOffersError}
        specialOffersProducts={rest.specialOffersProducts}
        specialOffersProductsPerPage={rest.specialOffersProductsPerPage}
        mobileCardsPerView={rest.mobileCardsPerView}
        onRetrySpecialOffers={rest.onRetrySpecialOffers}
        onSpecialOffersCarouselViewChange={rest.onSpecialOffersCarouselViewChange}
      />
    </div>
  );
}

/**
 * Product sections for the home page (stacked curated lists).
 */
export function HomeProductSections() {
  const { language, products, loading, error, fetchProducts, productsPerPage } =
    useFeaturedHomeProducts();

  const {
    language: specialOffersLanguage,
    products: specialOffersProducts,
    loading: specialOffersLoading,
    error: specialOffersError,
    fetchProducts: fetchSpecialOffersProducts,
    productsPerPage: specialOffersProductsPerPage,
  } = useSpecialOffersHomeProducts();

  const onRetry = useCallback(() => {
    fetchProducts(FEATURED_HOME_FILTER_DEFAULT);
  }, [fetchProducts]);

  const onRetrySpecialOffers = useCallback(() => {
    fetchSpecialOffersProducts(SPECIAL_OFFERS_HOME_FILTER_DEFAULT);
  }, [fetchSpecialOffersProducts]);

  const mobileCardsPerView = useHomeBestChoiceMobileCardsPerView();

  const {
    featuredCarousel,
    specialOffersCarousel,
    onFeaturedCarouselViewChange,
    onSpecialOffersCarouselViewChange,
  } = useHomeProductSectionsCarousels(
    productsPerPage,
    specialOffersProductsPerPage,
    mobileCardsPerView,
  );

  return (
    <section className="bg-white pb-0 pt-2 lg:pb-16 lg:pt-6" aria-labelledby="home-product-sections">
      <HomeProductSectionsBody
        language={language}
        products={products}
        loading={loading}
        error={error}
        productsPerPage={productsPerPage}
        onRetry={onRetry}
        specialOffersLanguage={specialOffersLanguage}
        specialOffersProducts={specialOffersProducts}
        specialOffersLoading={specialOffersLoading}
        specialOffersError={specialOffersError}
        specialOffersProductsPerPage={specialOffersProductsPerPage}
        onRetrySpecialOffers={onRetrySpecialOffers}
        featuredCarousel={featuredCarousel}
        specialOffersCarousel={specialOffersCarousel}
        onFeaturedCarouselViewChange={onFeaturedCarouselViewChange}
        onSpecialOffersCarouselViewChange={onSpecialOffersCarouselViewChange}
        mobileCardsPerView={mobileCardsPerView}
      />

      <div className="hidden lg:block">
        <WhyChooseUsSection />
      </div>

      <HomeMobileSaleBanner />
    </section>
  );
}

export const FeaturedProductsTabs = HomeProductSections;
