'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../lib/api-client';
import { getStoredLanguage, type LanguageCode } from '../lib/language';
import { ProductCard } from './ProductCard';
import { SITE_CONTENT_GUTTERS_CLASS } from './header-strip-layout';
import { t } from '../lib/i18n';
import type { ProductLabel } from './ProductLabels';

interface Product {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  price: number;
  compareAtPrice?: number | null;
  image: string | null;
  inStock: boolean;
  brand: {
    id: string;
    name: string;
  } | null;
  colors?: Array<{ value: string; imageUrl?: string | null; colors?: string[] | null }>; // Available colors from variants with imageUrl and colors hex
  sizes?: Array<{ value: string; imageUrl?: string | null }>; // Available sizes from variants
  attributes?: Record<string, Array<{ valueId?: string; value: string; label: string; imageUrl?: string | null; colors?: string[] | null }>>; // Other attributes (not color or size)
  originalPrice?: number | null;
  discountPercent?: number | null;
  labels?: ProductLabel[];
}

interface ProductsResponse {
  data: Product[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const PRODUCTS_PER_PAGE = 10;
const DEFAULT_HOME_FILTER = 'new' as const;
/** Fewer columns than catalog-style grids so home “best choice” cards read larger. */
const MOBILE_GRID_LAYOUT =
  'grid grid-cols-2 gap-5 sm:gap-6 md:grid-cols-3 lg:grid-cols-4 justify-items-center';
/** Each card is slightly narrower than the grid cell (centered). */
const BEST_CHOICE_CARD_WIDTH = 'w-[90%] max-w-full';
/** Hero image for the first “best choice” card (curated asset). */
const BEST_CHOICE_FIRST_CARD_IMAGE = '/images/home/best-choice-first.png';

/**
 * Featured products grid for the home page (single curated list).
 */
export function FeaturedProductsTabs() {
  // Use state for language to prevent hydration mismatch
  // Start with 'en' on server, update on client mount
  const [language, setLanguage] = useState<LanguageCode>('en');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Update language on mount and when language changes
  useEffect(() => {
    const updateLanguage = () => {
      const storedLang = getStoredLanguage();
      setLanguage(storedLang);
    };

    // Update immediately on mount
    updateLanguage();

    // Listen to language-updated events
    const handleLanguageUpdate = () => {
      updateLanguage();
    };

    window.addEventListener('language-updated', handleLanguageUpdate);
    return () => {
      window.removeEventListener('language-updated', handleLanguageUpdate);
    };
  }, []);

  /**
   * Fetch products for the home featured section
   */
  const fetchProducts = useCallback(async (filter: string | null) => {
    try {
      setLoading(true);
      setError(null);

      const currentLang = language;
      const params: Record<string, string> = {
        page: '1',
        limit: PRODUCTS_PER_PAGE.toString(),
        lang: currentLang,
      };

      // Add filter if provided
      if (filter) {
        params.filter = filter;
      }

      const response = await apiClient.get<ProductsResponse>('/api/v1/products', {
        params,
      });

      setProducts((response.data || []).slice(0, PRODUCTS_PER_PAGE));
    } catch (err) {
      console.error('[FeaturedProductsTabs] Error:', err);
      setError(t(language, 'home.featured_products.errorLoading'));
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    fetchProducts(DEFAULT_HOME_FILTER);
  }, [fetchProducts]);

  return (
    <section className="bg-gray-50 pb-16 pt-6" aria-labelledby="featured-products-tabs">
      <div className={SITE_CONTENT_GUTTERS_CLASS}>
        <h2 id="featured-products-tabs" className="sr-only">
          {t(language, 'home.featured_products.title')}
        </h2>

        {/* Products Grid */}
        {loading ? (
          <div className={MOBILE_GRID_LAYOUT}>
            {[...Array(PRODUCTS_PER_PAGE)].map((_, i) => (
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
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => {
                fetchProducts(DEFAULT_HOME_FILTER);
              }}
              className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
            >
              {t(language, 'home.featured_products.tryAgain')}
            </button>
          </div>
        ) : products.length > 0 ? (
          <div className={MOBILE_GRID_LAYOUT}>
            {products.slice(0, PRODUCTS_PER_PAGE).map((product, index) => (
              <div key={product.id} className={BEST_CHOICE_CARD_WIDTH}>
                <ProductCard
                  product={
                    index === 0
                      ? { ...product, image: BEST_CHOICE_FIRST_CARD_IMAGE }
                      : product
                  }
                  viewMode="grid-2"
                  shiftImageInFrame
                  squareImageFrame
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">{t(language, 'home.featured_products.noProducts')}</p>
          </div>
        )}
      </div>
    </section>
  );
}

