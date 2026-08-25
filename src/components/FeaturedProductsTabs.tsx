'use client';

import { useCallback } from 'react';
import { FeaturedBestChoiceGrid } from './FeaturedBestChoiceGrid';
import { FeaturedIntroHeading } from './FeaturedIntroHeading';
import { SpecialOffersProductGrid } from './SpecialOffersProductGrid';
import { SpecialOffersSectionHeading } from './SpecialOffersSectionHeading';
import { WhyChooseUsSection } from './WhyChooseUsSection';
import { HomeMobileSectionTitle } from './HomeMobileSectionTitle';
import { HomeMobileSaleBanner } from './HomeMobileSaleBanner';
import { HomePagePartnerLogos } from './HomePagePartnerLogos';
import { SITE_CONTENT_GUTTERS_CLASS } from './header-strip-layout';
import {
  HOME_CURATED_SECTION_FOLLOWING_MARGIN_CLASS,
  HOME_CURATED_SECTION_MOBILE_TITLE_CLASS,
  HOME_SECTION_HEADING_TO_GRID_GAP_LG_CLASS,
} from './home-best-choice.constants';
import type { HomeBrandLogo } from '@/lib/home/home-brand-logos';
import type { LanguageCode } from '../lib/language';
import { t } from '../lib/i18n';
import {
  FEATURED_HOME_FILTER_DEFAULT,
  useFeaturedHomeProducts,
  type FeaturedHomeProduct,
} from './useFeaturedHomeProducts';
import {
  SPECIAL_OFFERS_HOME_FILTER_DEFAULT,
  useSpecialOffersHomeProducts,
} from './useSpecialOffersHomeProducts';
import { useHomeProductSectionsCarousels } from './useHomeProductSectionsCarousels';
import { useHomeBestChoiceMobileCardsPerView } from './useHomeBestChoiceMobileCardsPerView';
import type { MobileCarouselViewState } from './useHomeBestChoiceCarouselPageSync';

export type HomeProductSectionsProps = {
  serverLanguage?: LanguageCode;
  initialFeaturedProducts?: FeaturedHomeProduct[];
  initialFeaturedFiltersKey?: string;
  initialSpecialOffersProducts?: FeaturedHomeProduct[];
  initialSpecialOffersFiltersKey?: string;
  homeBrands?: HomeBrandLogo[];
};

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
    <div className={HOME_CURATED_SECTION_FOLLOWING_MARGIN_CLASS}>
      <FeaturedIntroHeading />
      <HomeMobileSectionTitle
        sectionHeadingId="home-featured-heading-mobile"
        title={t(language, 'home.featured_intro.title')}
        titleClassName={HOME_CURATED_SECTION_MOBILE_TITLE_CLASS}
        syncedCarouselPageIndex={featuredCarousel.pageIndex}
        syncedCarouselPageCount={featuredCarousel.pageCount}
      />
      <div className={`mt-5 ${HOME_SECTION_HEADING_TO_GRID_GAP_LG_CLASS}`}>
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
    </div>
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
      <div className={`mt-5 ${HOME_SECTION_HEADING_TO_GRID_GAP_LG_CLASS}`}>
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
    </div>
  );
}

/**
 * Product sections for the home page (stacked curated lists).
 */
export function HomeProductSections({
  serverLanguage,
  initialFeaturedProducts,
  initialFeaturedFiltersKey,
  initialSpecialOffersProducts,
  initialSpecialOffersFiltersKey,
  homeBrands = [],
}: HomeProductSectionsProps = {}) {
  const { language, products, loading, error, fetchProducts, productsPerPage } =
    useFeaturedHomeProducts({
      serverLanguage,
      initialProducts: initialFeaturedProducts,
      initialFiltersKey: initialFeaturedFiltersKey,
    });

  const {
    language: specialOffersLanguage,
    products: specialOffersProducts,
    loading: specialOffersLoading,
    error: specialOffersError,
    fetchProducts: fetchSpecialOffersProducts,
    productsPerPage: specialOffersProductsPerPage,
  } = useSpecialOffersHomeProducts({
    serverLanguage,
    initialProducts: initialSpecialOffersProducts,
    initialFiltersKey: initialSpecialOffersFiltersKey,
  });

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
    <section className="bg-gray-50 pb-0 pt-2 lg:pt-0" aria-labelledby="home-product-sections">
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

      <div className="bg-white lg:mt-12 lg:pb-16 lg:pt-[4.5rem]">
        <div className="hidden lg:block">
          <WhyChooseUsSection />
        </div>

        <HomePagePartnerLogos brands={homeBrands} />

        <HomeMobileSaleBanner />
      </div>
    </section>
  );
}

export const FeaturedProductsTabs = HomeProductSections;
