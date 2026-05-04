'use client';

import { useState, useEffect, useRef, type MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../lib/api-client';
import { getStoredCurrency } from '../lib/currency';
import { getStoredLanguage, type LanguageCode } from '../lib/language';
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

interface RelatedProductsProps {
  currentProductSlug: string;
}

/**
 * RelatedProducts component - displays products from the same category in a carousel
 * Shown at the bottom of the single product page
 */
export function RelatedProducts({ currentProductSlug }: RelatedProductsProps) {
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const [language, setLanguage] = useState<LanguageCode>('en');
  const addToCartInFlightRef = useRef<Set<string>>(new Set());
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
    handleWheel,
  } = useCarousel({ itemCount: products.length, visibleItems: visibleCards });

  // Initialize language from localStorage after mount to prevent hydration mismatch
  useEffect(() => {
    setLanguage(getStoredLanguage());
    
    const handleLanguageUpdate = () => {
      setLanguage(getStoredLanguage());
    };
    
    window.addEventListener('language-updated', handleLanguageUpdate);
    return () => {
      window.removeEventListener('language-updated', handleLanguageUpdate);
    };
  }, []);

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
        const err = error as { message?: string };
        if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
          router.push(`/login?redirect=/products/${product.slug}`);
        } else {
          alert('Failed to add product to cart. Please try again.');
        }
      } finally {
        addToCartInFlightRef.current.delete(product.id);
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
          // Loading state
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square bg-gray-200 rounded-lg mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          // Empty state
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">{t(language, 'product.noRelatedProducts')}</p>
          </div>
        ) : (
          // Products Carousel
          <div className="relative">
            {/* Carousel Container */}
            <div 
              ref={carouselRef}
              className="relative overflow-hidden cursor-grab active:cursor-grabbing select-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onWheel={handleWheel}
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
                    isAddingToCart={false}
                    hasMoved={hasMoved}
                    onAddToCart={handleAddToCart}
                    onImageError={handleImageError}
                    imageError={imageErrors.has(product.id)}
                    width={`${100 / visibleCards}%`}
                  />
                ))}
              </div>
            </div>

            {/* Navigation Arrows - Only show if there are more products than visible */}
            {products.length > visibleCards && (
              <CarouselNavigation onPrevious={goToPrevious} onNext={goToNext} />
            )}

            {/* Dots Indicator - Only show if there are more products than visible */}
            {products.length > visibleCards && (
              <CarouselDots
                totalItems={products.length}
                visibleItems={visibleCards}
                currentIndex={currentIndex}
                onDotClick={goToIndex}
              />
            )}
          </div>
        )}
      </div>
    </section>
  );
}

