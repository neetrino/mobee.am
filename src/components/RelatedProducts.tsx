'use client';

import { useState, useRef, type MouseEvent } from 'react';
import { apiClient } from '../lib/api-client';
import { getStoredCurrency } from '../lib/currency';
import { t } from '../lib/i18n';
import { useAuth } from '../lib/auth/AuthContext';
import { dispatchCartFlyAnimation } from '../lib/cart/dispatchCartFlyAnimation';
import { resolveProductCardImageSrc } from '../lib/productCardDisplayImage';
import { upsertGuestCartItem } from '../lib/cart/guest-cart';
import { fetchProductBySlugWithLang } from '../lib/shop/fetchProductBySlugWithLang';
import { useRelatedProducts } from './hooks/useRelatedProducts';
import { useCarousel } from './hooks/useCarousel';
import { useVisibleCards } from './hooks/useVisibleCards';
import { RelatedProductCard } from './RelatedProducts/RelatedProductCard';
import { CarouselNavigation } from './RelatedProducts/CarouselNavigation';
import { CarouselDots } from './RelatedProducts/CarouselDots';
import { useUiLanguage } from './UiLanguageProvider';
import { chunkArray } from '../lib/chunk-array';
import {
  HOME_BEST_CHOICE_MOBILE_CAROUSEL,
  HOME_BEST_CHOICE_MOBILE_PAGE,
  homeBestChoiceMobileInnerGridClass,
} from './HomeBestChoiceStyleProductGrid';
import { useHomeBestChoiceMobileCardsPerView } from './useHomeBestChoiceMobileCardsPerView';
import { useHomeBestChoiceCarouselPageSync } from './useHomeBestChoiceCarouselPageSync';

interface RelatedProductsProps {
  currentProductSlug: string;
}

/**
 * Below `lg`: horizontal snap carousel (same shell as home best-choice).
 * At `lg+`: draggable strip with arrows/dots.
 */
export function RelatedProducts({ currentProductSlug }: RelatedProductsProps) {
  const { isLoggedIn } = useAuth();
  const language = useUiLanguage();
  const mobileCardsPerView = useHomeBestChoiceMobileCardsPerView();
  const addToCartInFlightRef = useRef<Set<string>>(new Set());
  const [addingProductId, setAddingProductId] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  
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
      ? Math.max(1, Math.ceil(8 / mobileCardsPerView))
      : products.length > 0
        ? Math.max(1, Math.ceil(products.length / mobileCardsPerView))
        : 1;

  const mobileCarouselRef = useHomeBestChoiceCarouselPageSync(mobileCarouselPageCount, undefined);

  const mobileInnerGridClass = homeBestChoiceMobileInnerGridClass(mobileCardsPerView);

  /**
   * Handle adding product to cart
   */
  const handleAddToCart = (e: MouseEvent, product: (typeof products)[0]) => {
    e.preventDefault();
    e.stopPropagation();

    if (!product.inStock || addToCartInFlightRef.current.has(product.id)) {
      return;
    }

    const cardRoot = (e.currentTarget as HTMLElement).closest('[data-related-product-card]');
    const flySource = cardRoot?.querySelector<HTMLElement>('[data-cart-fly-source]') ?? null;
    const runFly = () => {
      dispatchCartFlyAnimation(resolveProductCardImageSrc(product.image), flySource);
    };

    if (isLoggedIn) {
      window.dispatchEvent(
        new CustomEvent('cart-updated', {
          detail: { optimisticAdd: { quantity: 1, price: product.price } },
        }),
      );
      runFly();
    }

    addToCartInFlightRef.current.add(product.id);
    setAddingProductId(product.id);

    void (async () => {
      try {
        interface ProductDetails {
          id: string;
          slug: string;
          variants?: Array<{
            id: string;
            sku: string;
            price: number;
            stock: number;
            available: boolean;
          }>;
        }

        let variantId: string;
        let bodyProductId = product.id;

        const presetVariantId = product.defaultVariantId ?? null;
        if (presetVariantId) {
          variantId = presetVariantId;
        } else {
          const encodedSlug = encodeURIComponent(product.slug.trim());
          const productDetails = await fetchProductBySlugWithLang<ProductDetails>(encodedSlug);

          if (!productDetails.variants || productDetails.variants.length === 0) {
            alert('No variants available');
            if (isLoggedIn) {
              window.dispatchEvent(new Event('cart-updated'));
            }
            return;
          }

          variantId = productDetails.variants[0].id;
          bodyProductId = productDetails.id;
        }

        if (!isLoggedIn) {
          upsertGuestCartItem({
            productId: bodyProductId,
            productSlug: product.slug,
            variantId,
            quantity: 1,
          });
          window.dispatchEvent(new Event('cart-updated'));
          runFly();
        } else {
          const response = await apiClient.post<{ cartSummary?: { itemsCount: number; total: number } }>(
            '/api/v1/cart/items',
            {
              productId: bodyProductId,
              variantId,
              quantity: 1,
            },
          );
          window.dispatchEvent(
            new CustomEvent('cart-updated', {
              detail: response.cartSummary ?? null,
            }),
          );
        }
      } catch (error: unknown) {
        console.error('[RelatedProducts] Error adding to cart:', error);
        if (isLoggedIn) {
          window.dispatchEvent(new Event('cart-updated'));
        }
        alert('Failed to add product to cart. Please try again.');
      } finally {
        addToCartInFlightRef.current.delete(product.id);
        setAddingProductId((current) => (current === product.id ? null : current));
      }
    })();
  };

  const currency = getStoredCurrency();
  const handleImageError = (productId: string) => {
    setImageErrors(prev => new Set(prev).add(productId));
  };

  // Always show the section, even if no products (will show loading or empty state)
  return (
    <section className="py-12 mt-20 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-10">{t(language, 'product.related_products_title')}</h2>
        
        {loading ? (
          <>
            <div
              ref={mobileCarouselRef}
              className={HOME_BEST_CHOICE_MOBILE_CAROUSEL}
              role="region"
              aria-roledescription="carousel"
              aria-label={t(language, 'product.related_products_title')}
              aria-busy="true"
            >
              {chunkArray([1, 2, 3, 4, 5, 6, 7, 8], mobileCardsPerView).map((page, pageIndex) => (
                <div key={`related-sk-${pageIndex}`} className={HOME_BEST_CHOICE_MOBILE_PAGE}>
                  <div className={mobileInnerGridClass}>
                    {page.map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="mb-4 aspect-square rounded-lg bg-gray-200" />
                        <div className="mb-2 h-4 w-3/4 rounded bg-gray-200" />
                        <div className="h-4 w-1/2 rounded bg-gray-200" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden grid-cols-4 gap-6 lg:grid">
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
              ref={mobileCarouselRef}
              className={HOME_BEST_CHOICE_MOBILE_CAROUSEL}
              role="region"
              aria-roledescription="carousel"
              aria-label={t(language, 'product.related_products_title')}
            >
              {chunkArray(products, mobileCardsPerView).map((page, pageIndex) => (
                <div key={`related-page-${pageIndex}`} className={HOME_BEST_CHOICE_MOBILE_PAGE}>
                  <div className={mobileInnerGridClass}>
                    {page.map((product) => (
                      <RelatedProductCard
                        key={product.id}
                        product={product}
                        currency={currency}
                        language={language}
                        isAddingToCart={addingProductId === product.id}
                        hasMoved={false}
                        onAddToCart={handleAddToCart}
                        onImageError={handleImageError}
                        imageError={imageErrors.has(product.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="relative hidden lg:block">
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
                    <RelatedProductCard
                      key={product.id}
                      product={product}
                      currency={currency}
                      language={language}
                      isAddingToCart={addingProductId === product.id}
                      hasMoved={hasMoved}
                      onAddToCart={handleAddToCart}
                      onImageError={handleImageError}
                      imageError={imageErrors.has(product.id)}
                      width={`${100 / visibleCards}%`}
                    />
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
  );
}

