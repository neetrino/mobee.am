'use client';

import { useCallback, useState } from 'react';
import { t } from '../lib/i18n';
import { HOME_PRODUCTS_PER_PAGE } from '@/lib/home/home-product-filters';
import { useRelatedProducts, type RelatedProduct, type RelatedProductsContext } from './hooks/useRelatedProducts';
import { useUiLanguage } from './UiLanguageProvider';
import { HomeMobileSectionTitle } from './HomeMobileSectionTitle';
import {
  HomeBestChoiceStyleProductGrid,
  HomeBestChoiceStyleProductGridSkeleton,
} from './HomeBestChoiceStyleProductGrid';
import {
  HOME_CURATED_SECTION_DESKTOP_TITLE_CLASS,
  HOME_CURATED_SECTION_MOBILE_TITLE_CLASS,
  HOME_SECTION_HEADING_TO_GRID_GAP_LG_CLASS,
  HOME_SPECIAL_OFFERS_DESKTOP_PAGE_COLS,
  HOME_SPECIAL_OFFERS_DESKTOP_PAGE_ROWS,
} from './home-best-choice.constants';
import { SITE_CONTENT_GUTTERS_CLASS } from './header-strip-layout';
import { useHomeBestChoiceMobileCardsPerView } from './useHomeBestChoiceMobileCardsPerView';
import type { MobileCarouselViewState } from './useHomeBestChoiceCarouselPageSync';
import type { FeaturedHomeProduct } from './useFeaturedHomeProducts';
import { siteMontserrat } from '@/lib/fonts/site-fonts';

/** Offset under PDP description — narrower than home’s first curated block gap. */
const RELATED_PRODUCTS_SECTION_TOP_CLASS = 'mt-10 lg:mt-16';

/** Space before the site footer so cards are not flush against it. */
const RELATED_PRODUCTS_SECTION_BOTTOM_CLASS = 'mb-12 pb-8 lg:mb-16 lg:pb-12';

interface RelatedProductsProps {
  currentProductSlug: string;
  relatedContext?: RelatedProductsContext | null;
}

function mapRelatedProductToFeaturedHomeProduct(product: RelatedProduct): FeaturedHomeProduct {
  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    price: product.price,
    image: product.image,
    inStock: product.inStock,
    brand: product.brand ?? null,
    compareAtPrice: product.compareAtPrice,
    originalPrice: product.originalPrice ?? null,
    discountPercent: product.discountPercent ?? null,
    categories: product.categories,
  };
}

/**
 * PDP “related products” — same carousel/grid shell as home {@link SpecialOffersProductGrid}.
 */
export function RelatedProducts({ currentProductSlug, relatedContext }: RelatedProductsProps) {
  const language = useUiLanguage();
  const mobileCardsPerView = useHomeBestChoiceMobileCardsPerView();
  const { products, loading, failed } = useRelatedProducts({
    currentProductSlug,
    language,
    relatedContext,
  });

  const [relatedCarousel, setRelatedCarousel] = useState<MobileCarouselViewState>(() => ({
    pageIndex: 0,
    pageCount: Math.max(1, Math.ceil(HOME_PRODUCTS_PER_PAGE / mobileCardsPerView)),
  }));

  const onRelatedCarouselViewChange = useCallback((state: MobileCarouselViewState) => {
    setRelatedCarousel((prev) =>
      prev.pageIndex === state.pageIndex && prev.pageCount === state.pageCount ? prev : state,
    );
  }, []);

  if (failed && !loading && products.length === 0) {
    return null;
  }

  const sectionTitle = t(language, 'product.related_products_title');
  const featuredProducts = products.map(mapRelatedProductToFeaturedHomeProduct);
  const carouselAriaLabel = t(language, 'home.featured_products.carouselAriaLabel');

  return (
    <section
      className={`${siteMontserrat.className} ${RELATED_PRODUCTS_SECTION_TOP_CLASS} ${RELATED_PRODUCTS_SECTION_BOTTOM_CLASS}`}
      aria-label={sectionTitle}
    >
      <div className={SITE_CONTENT_GUTTERS_CLASS}>
        <div className="hidden lg:block">
          <h2 id="related-products-heading" className={HOME_CURATED_SECTION_DESKTOP_TITLE_CLASS}>
            {sectionTitle}
          </h2>
        </div>
        <HomeMobileSectionTitle
          sectionHeadingId="related-products-heading-mobile"
          title={sectionTitle}
          titleClassName={HOME_CURATED_SECTION_MOBILE_TITLE_CLASS}
          syncedCarouselPageIndex={relatedCarousel.pageIndex}
          syncedCarouselPageCount={relatedCarousel.pageCount}
        />

        <div className={`mt-5 ${HOME_SECTION_HEADING_TO_GRID_GAP_LG_CLASS}`}>
          {loading ? (
            <HomeBestChoiceStyleProductGridSkeleton
              productsPerPage={HOME_PRODUCTS_PER_PAGE}
              mobileCardsPerView={mobileCardsPerView}
              mobileCarouselAriaLabel={carouselAriaLabel}
              onMobileCarouselViewChange={onRelatedCarouselViewChange}
              desktopPageRows={HOME_SPECIAL_OFFERS_DESKTOP_PAGE_ROWS}
              desktopPageCols={HOME_SPECIAL_OFFERS_DESKTOP_PAGE_COLS}
            />
          ) : featuredProducts.length > 0 ? (
            <HomeBestChoiceStyleProductGrid
              products={featuredProducts}
              productsPerPage={HOME_PRODUCTS_PER_PAGE}
              mobileCardsPerView={mobileCardsPerView}
              mobileCarouselAriaLabel={carouselAriaLabel}
              onMobileCarouselViewChange={onRelatedCarouselViewChange}
              desktopPageRows={HOME_SPECIAL_OFFERS_DESKTOP_PAGE_ROWS}
              desktopPageCols={HOME_SPECIAL_OFFERS_DESKTOP_PAGE_COLS}
              desktopPrevAriaLabel={t(language, 'home.featured_products.scrollPrevious')}
              desktopNextAriaLabel={t(language, 'home.featured_products.scrollNext')}
            />
          ) : (
            <div className="py-12 text-center">
              <p className="text-lg text-gray-500">{t(language, 'product.noRelatedProducts')}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
