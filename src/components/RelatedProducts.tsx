'use client';

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type ComponentProps,
} from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { t } from '../lib/i18n';
import { useRelatedProducts, type RelatedProduct } from './hooks/useRelatedProducts';
import { useCarousel } from './hooks/useCarousel';
import { useVisibleCards } from './hooks/useVisibleCards';
import { ProductCardListingProvider } from './ProductCardListingContext';
import { ProductCard } from './ProductCard';
import { CarouselNavigation } from './RelatedProducts/CarouselNavigation';
import { CarouselDots } from './RelatedProducts/CarouselDots';
import { useUiLanguage } from './UiLanguageProvider';
import { chunkArray } from '../lib/chunk-array';
import {
  HOME_BEST_CHOICE_CARD_WIDTH,
  HOME_BEST_CHOICE_MOBILE_CAROUSEL_SCROLL,
  HOME_BEST_CHOICE_MOBILE_PAGE,
  getHomeCuratedProductCardProps,
  getHomeCuratedDesktopProductCardProps,
} from './HomeBestChoiceStyleProductGrid';
import { useHomeDesktopCarouselHomeStyle } from './useHomeDesktopCarouselHomeStyle';
import {
  useHomeBestChoiceCarouselPageSync,
  type MobileCarouselViewState,
} from './useHomeBestChoiceCarouselPageSync';
import { HomeMobileSectionTitle, HomeMobileCarouselPageIndicators } from './HomeMobileSectionTitle';
import {
  RELATED_PRODUCTS_IPAD_PRO_CAROUSEL_RIGHT_INSET_CLASS,
  RELATED_PRODUCTS_MOBILE_CARDS_PER_PAGE_IPAD_MINI,
  RELATED_PRODUCTS_MOBILE_CARDS_PER_PAGE_IPAD_PRO,
  RELATED_PRODUCTS_MOBILE_CAROUSEL_BLEED_CLASS,
  RELATED_PRODUCTS_MOBILE_TITLE_NAV_GROUP_CLASS,
  RELATED_PRODUCTS_MOBILE_TITLE_NAV_BUTTON_BASE_CLASS,
  RELATED_PRODUCTS_MOBILE_TITLE_NAV_BUTTON_IDLE_CLASS,
  RELATED_PRODUCTS_MOBILE_TITLE_NAV_BUTTON_LATCHED_CLASS,
} from './RelatedProducts/related-products-mobile.constants';
import { useRelatedProductsMobileCardsPerPage } from './hooks/useRelatedProductsMobileCardsPerPage';

interface RelatedProductsProps {
  currentProductSlug: string;
}

/** Full grid slots on every snap page so card column widths stay consistent (last partial page). */
function padChunkToGroupSize<T>(chunk: readonly T[], groupSize: number): (T | undefined)[] {
  const out: (T | undefined)[] = [...chunk];
  while (out.length < groupSize) {
    out.push(undefined);
  }
  return out;
}

const RELATED_MOBILE_GRID_CHILD_MIN_WIDTH = '[&>*]:min-w-0';

type HomeGridRelatedCardProduct = ComponentProps<typeof ProductCard>['product'];

function mapRelatedProductToHomeGridCardProduct(product: RelatedProduct): HomeGridRelatedCardProduct {
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
    defaultVariantId: product.defaultVariantId ?? undefined,
  };
}

type RelatedMobileTitleNavLatch = 'prev' | 'next' | null;

/**
 * Below `xl`: horizontal snap carousel (same shell as home best-choice) with title-row nav + dot indicators.
 * iPad mini band: 3 cards per page; iPad Pro band (900–1279px): 4 cards per page; phones: 2.
 * At `xl+`: draggable strip with arrows/dots (unchanged wide desktop).
 */
export function RelatedProducts({ currentProductSlug }: RelatedProductsProps) {
  const language = useUiLanguage();
  const desktopHomeStyle = useHomeDesktopCarouselHomeStyle();
  const relatedMobileCardsPerPage = useRelatedProductsMobileCardsPerPage();
  const relatedMobileTitleNavGroupRef = useRef<HTMLSpanElement>(null);
  const [relatedMobileTitleNavLatch, setRelatedMobileTitleNavLatch] =
    useState<RelatedMobileTitleNavLatch>(null);
  
  const visibleCards = useVisibleCards();
  const { products, loading } = useRelatedProducts({ currentProductSlug, language });
  
  const {
    currentIndex,
    isDragging,
    hasMoved,
    carouselRef,
    goToPrevious,
    goToNext,
    goToIndex,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useCarousel({
    itemCount: products.length,
    visibleItems: visibleCards,
    autoRotateInterval: 0,
  });

  const mobileCarouselPageCount =
    loading
      ? Math.max(1, Math.ceil(8 / relatedMobileCardsPerPage))
      : products.length > 0
        ? Math.max(1, Math.ceil(products.length / relatedMobileCardsPerPage))
        : 1;

  const [relatedMobileCarousel, setRelatedMobileCarousel] = useState<MobileCarouselViewState>(() => ({
    pageIndex: 0,
    pageCount: 1,
  }));

  const onRelatedMobileCarouselViewChange = useCallback((state: MobileCarouselViewState) => {
    setRelatedMobileCarousel((prev) =>
      prev.pageIndex === state.pageIndex && prev.pageCount === state.pageCount ? prev : state,
    );
  }, []);

  useEffect(() => {
    setRelatedMobileCarousel((prev) => ({
      pageCount: mobileCarouselPageCount,
      pageIndex: Math.min(prev.pageIndex, Math.max(0, mobileCarouselPageCount - 1)),
    }));
  }, [mobileCarouselPageCount]);

  const mobileCarouselRef = useHomeBestChoiceCarouselPageSync(
    mobileCarouselPageCount,
    onRelatedMobileCarouselViewChange,
  );

  const relatedMobileGridColsClass =
    relatedMobileCardsPerPage === RELATED_PRODUCTS_MOBILE_CARDS_PER_PAGE_IPAD_PRO
      ? 'grid-cols-4'
      : relatedMobileCardsPerPage === RELATED_PRODUCTS_MOBILE_CARDS_PER_PAGE_IPAD_MINI
        ? 'grid-cols-3'
        : 'grid-cols-2';
  const relatedMobileGridClass = `grid ${relatedMobileGridColsClass} gap-4 ${RELATED_MOBILE_GRID_CHILD_MIN_WIDTH}`;
  const relatedMobileViewMode: 'grid-2' | 'grid-3' =
    relatedMobileCardsPerPage === RELATED_PRODUCTS_MOBILE_CARDS_PER_PAGE_IPAD_MINI ||
    relatedMobileCardsPerPage === RELATED_PRODUCTS_MOBILE_CARDS_PER_PAGE_IPAD_PRO
      ? 'grid-3'
      : 'grid-2';
  const homeMobileCardProps = getHomeCuratedProductCardProps(true);
  const homeDesktopCardProps = getHomeCuratedDesktopProductCardProps(desktopHomeStyle);

  const scrollRelatedMobileByPage = useCallback((direction: -1 | 1) => {
    const el = mobileCarouselRef.current;
    if (!el) {
      return;
    }
    el.scrollBy({ left: direction * el.clientWidth, behavior: 'smooth' });
  }, [mobileCarouselRef]);

  const relatedMobileCanScrollPrev = relatedMobileCarousel.pageIndex > 0;
  const relatedMobileCanScrollNext =
    relatedMobileCarousel.pageIndex < relatedMobileCarousel.pageCount - 1;

  useEffect(() => {
    if (mobileCarouselPageCount <= 1) {
      setRelatedMobileTitleNavLatch(null);
    }
  }, [mobileCarouselPageCount]);

  useEffect(() => {
    if (relatedMobileTitleNavLatch === 'prev' && !relatedMobileCanScrollPrev) {
      setRelatedMobileTitleNavLatch(null);
      return;
    }
    if (relatedMobileTitleNavLatch === 'next' && !relatedMobileCanScrollNext) {
      setRelatedMobileTitleNavLatch(null);
    }
  }, [
    relatedMobileTitleNavLatch,
    relatedMobileCanScrollPrev,
    relatedMobileCanScrollNext,
  ]);

  useEffect(() => {
    if (relatedMobileTitleNavLatch === null) {
      return;
    }
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (relatedMobileTitleNavGroupRef.current?.contains(target)) {
        return;
      }
      setRelatedMobileTitleNavLatch(null);
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [relatedMobileTitleNavLatch]);

  const relatedMobileTitleTrailing =
    mobileCarouselPageCount > 1 ? (
      <span ref={relatedMobileTitleNavGroupRef} className={RELATED_PRODUCTS_MOBILE_TITLE_NAV_GROUP_CLASS}>
        <button
          type="button"
          className={`${RELATED_PRODUCTS_MOBILE_TITLE_NAV_BUTTON_BASE_CLASS} ${
            relatedMobileTitleNavLatch === 'prev'
              ? RELATED_PRODUCTS_MOBILE_TITLE_NAV_BUTTON_LATCHED_CLASS
              : RELATED_PRODUCTS_MOBILE_TITLE_NAV_BUTTON_IDLE_CLASS
          }`}
          disabled={!relatedMobileCanScrollPrev}
          aria-pressed={relatedMobileTitleNavLatch === 'prev'}
          onClick={() => {
            scrollRelatedMobileByPage(-1);
            setRelatedMobileTitleNavLatch('prev');
          }}
          aria-label={t(language, 'home.featured_products.scrollPrevious')}
        >
          <ChevronLeft className="h-5 w-5 shrink-0" aria-hidden />
        </button>
        <button
          type="button"
          className={`${RELATED_PRODUCTS_MOBILE_TITLE_NAV_BUTTON_BASE_CLASS} ${
            relatedMobileTitleNavLatch === 'next'
              ? RELATED_PRODUCTS_MOBILE_TITLE_NAV_BUTTON_LATCHED_CLASS
              : RELATED_PRODUCTS_MOBILE_TITLE_NAV_BUTTON_IDLE_CLASS
          }`}
          disabled={!relatedMobileCanScrollNext}
          aria-pressed={relatedMobileTitleNavLatch === 'next'}
          onClick={() => {
            scrollRelatedMobileByPage(1);
            setRelatedMobileTitleNavLatch('next');
          }}
          aria-label={t(language, 'home.featured_products.scrollNext')}
        >
          <ChevronRight className="h-5 w-5 shrink-0" aria-hidden />
        </button>
      </span>
    ) : null;

  // Always show the section, even if no products (will show loading or empty state)
  return (
    <ProductCardListingProvider>
    <section className="mt-12 border-t border-gray-200 py-8 max-lg:py-6 sm:mt-16 lg:mt-20 lg:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {loading || products.length > 0 ? (
          <div className="mb-8 lg:mb-10">
            <HomeMobileSectionTitle
              title={t(language, 'product.related_products_title')}
              titleClassName="text-2xl font-bold leading-snug text-gray-900"
              rootClassName="-ml-1.5 flex items-center justify-between gap-2 pl-2 pr-3 pt-4 sm:-ml-2 sm:pl-3 sm:pr-4 xl:hidden"
              hideIndicators
              trailing={relatedMobileTitleTrailing}
            />
            <h2 className="-ml-1 hidden text-4xl font-bold text-gray-900 sm:-ml-2 xl:block">
              {t(language, 'product.related_products_title')}
            </h2>
          </div>
        ) : (
          <h2 className="-ml-1 mb-10 text-4xl font-bold text-gray-900 sm:-ml-2">
            {t(language, 'product.related_products_title')}
          </h2>
        )}

        {loading ? (
          <>
            <div
              className={`${RELATED_PRODUCTS_MOBILE_CAROUSEL_BLEED_CLASS} ${RELATED_PRODUCTS_IPAD_PRO_CAROUSEL_RIGHT_INSET_CLASS}`}
            >
              <div
                ref={mobileCarouselRef}
                className={`${HOME_BEST_CHOICE_MOBILE_CAROUSEL_SCROLL} xl:hidden`}
                role="region"
                aria-roledescription="carousel"
                aria-label={t(language, 'product.related_products_title')}
                aria-busy="true"
              >
                {chunkArray([1, 2, 3, 4, 5, 6, 7, 8], relatedMobileCardsPerPage).map(
                  (page, pageIndex) => (
                    <div key={`related-sk-${pageIndex}`} className={HOME_BEST_CHOICE_MOBILE_PAGE}>
                      <div className={relatedMobileGridClass}>
                        {padChunkToGroupSize(page, relatedMobileCardsPerPage).map(
                          (slot, slotIndex) =>
                            slot !== undefined ? (
                              <div key={slot} className="animate-pulse">
                                <div className="mb-4 aspect-square rounded-lg bg-gray-200" />
                                <div className="mb-2 h-4 w-3/4 rounded bg-gray-200" />
                                <div className="h-4 w-1/2 rounded bg-gray-200" />
                              </div>
                            ) : (
                              <div
                                key={`related-sk-empty-${pageIndex}-${slotIndex}`}
                                aria-hidden
                                className="min-w-0"
                              />
                            ),
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
            <HomeMobileCarouselPageIndicators
              pageIndex={relatedMobileCarousel.pageIndex}
              pageCount={relatedMobileCarousel.pageCount}
              className="mt-5 mb-0 xl:mb-8 xl:hidden"
            />
            <div className="hidden grid-cols-4 gap-6 xl:grid">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={`d-${i}`} className="animate-pulse">
                  <div className="mb-4 aspect-square rounded-lg bg-gray-200" />
                  <div className="mb-2 h-4 w-3/4 rounded bg-gray-200" />
                  <div className="h-4 w-1/2 rounded bg-gray-200" />
                </div>
              ))}
            </div>
          </>
        ) : products.length === 0 ? (
          // Empty state
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">{t(language, 'product.noRelatedProducts')}</p>
          </div>
        ) : (
          <>
            <div
              className={`${RELATED_PRODUCTS_MOBILE_CAROUSEL_BLEED_CLASS} ${RELATED_PRODUCTS_IPAD_PRO_CAROUSEL_RIGHT_INSET_CLASS}`}
            >
              <div
                ref={mobileCarouselRef}
                className={`${HOME_BEST_CHOICE_MOBILE_CAROUSEL_SCROLL} xl:hidden`}
                role="region"
                aria-roledescription="carousel"
                aria-label={t(language, 'product.related_products_title')}
              >
                {chunkArray(products, relatedMobileCardsPerPage).map((page, pageIndex) => (
                  <div key={`related-page-${pageIndex}`} className={HOME_BEST_CHOICE_MOBILE_PAGE}>
                    <div className={relatedMobileGridClass}>
                      {padChunkToGroupSize(page, relatedMobileCardsPerPage).map(
                        (product, slotIndex) =>
                          product ? (
                            <div key={product.id} className={HOME_BEST_CHOICE_CARD_WIDTH}>
                              <ProductCard
                                product={mapRelatedProductToHomeGridCardProduct(product)}
                                viewMode={relatedMobileViewMode}
                                {...homeMobileCardProps}
                              />
                            </div>
                          ) : (
                            <div
                              key={`related-empty-${pageIndex}-${slotIndex}`}
                              aria-hidden
                              className="min-w-0"
                            />
                          ),
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <HomeMobileCarouselPageIndicators
              pageIndex={relatedMobileCarousel.pageIndex}
              pageCount={relatedMobileCarousel.pageCount}
              className="mt-6 mb-0 xl:mb-8 xl:hidden"
            />

            <div className="relative hidden xl:block">
              <div
                ref={carouselRef}
                className="relative cursor-grab touch-pan-y select-none overflow-hidden active:cursor-grabbing"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <div
                  className="flex items-stretch"
                  style={{
                    transform: `translateX(-${currentIndex * (100 / visibleCards)}%)`,
                    transition: isDragging ? 'none' : 'transform 0.5s ease-in-out',
                  }}
                >
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="h-full flex-shrink-0 px-3"
                      style={{ width: `${100 / visibleCards}%` }}
                      onClickCapture={(event) => {
                        if (hasMoved) {
                          event.preventDefault();
                          event.stopPropagation();
                        }
                      }}
                    >
                      <div className={HOME_BEST_CHOICE_CARD_WIDTH}>
                        <ProductCard
                          product={mapRelatedProductToHomeGridCardProduct(product)}
                          viewMode="grid-2"
                          {...homeDesktopCardProps}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {products.length > visibleCards ? (
                <CarouselNavigation onPrevious={goToPrevious} onNext={goToNext} />
              ) : null}

              {products.length > visibleCards ? (
                <CarouselDots
                  totalItems={products.length}
                  visibleItems={visibleCards}
                  currentIndex={currentIndex}
                  onDotClick={goToIndex}
                />
              ) : null}
            </div>
          </>
        )}
      </div>
    </section>
    </ProductCardListingProvider>
  );
}

