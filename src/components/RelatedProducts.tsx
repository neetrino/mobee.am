'use client';

import { useState, useEffect, type MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../lib/api-client';
import { getStoredCurrency } from '../lib/currency';
import { getStoredLanguage, type LanguageCode } from '../lib/language';
import { t } from '../lib/i18n';
import { useAuth } from '../lib/auth/AuthContext';
import { useRelatedProducts } from './hooks/useRelatedProducts';
import { useCarousel } from './hooks/useCarousel';
import { useVisibleCards } from './hooks/useVisibleCards';
import { RelatedProductCard } from './RelatedProducts/RelatedProductCard';
import { CarouselNavigation } from './RelatedProducts/CarouselNavigation';
import { CarouselDots } from './RelatedProducts/CarouselDots';

interface RelatedProductsProps {
  categorySlug?: string;
  currentProductId: string;
}

/**
 * RelatedProducts component - displays products from the same category in a carousel
 * Shown at the bottom of the single product page
 */
export function RelatedProducts({ categorySlug, currentProductId }: RelatedProductsProps) {
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const [language, setLanguage] = useState<LanguageCode>('en');
  const [addingToCart, setAddingToCart] = useState<Set<string>>(new Set());
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  
  const visibleCards = useVisibleCards();
  const { products, loading } = useRelatedProducts({ categorySlug, currentProductId, language });
  
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
  const handleAddToCart = async (e: MouseEvent, product: typeof products[0]) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!product.inStock) {
      return;
    }

    if (!isLoggedIn) {
      router.push(`/login?redirect=/products/${product.slug}`);
      return;
    }

    setAddingToCart(prev => new Set(prev).add(product.id));

    try {
      // Get product details to get variant ID
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

      const encodedSlug = encodeURIComponent(product.slug.trim());
      const productDetails = await apiClient.get<ProductDetails>(`/api/v1/products/${encodedSlug}`);

      if (!productDetails.variants || productDetails.variants.length === 0) {
        alert('No variants available');
        return;
      }

      const variantId = productDetails.variants[0].id;
      
      await apiClient.post(
        '/api/v1/cart/items',
        {
          productId: product.id,
          variantId: variantId,
          quantity: 1,
        }
      );

      // Trigger cart update event
      window.dispatchEvent(new Event('cart-updated'));
    } catch (error: unknown) {
      console.error('[RelatedProducts] Error adding to cart:', error);
      const err = error as { message?: string };
      if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        router.push(`/login?redirect=/products/${product.slug}`);
      } else {
        alert('Failed to add product to cart. Please try again.');
      }
    } finally {
      setAddingToCart(prev => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }
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
                    isAddingToCart={addingToCart.has(product.id)}
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

