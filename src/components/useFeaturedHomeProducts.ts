'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '../lib/api-client';
import { type LanguageCode } from '../lib/language';
import { t } from '../lib/i18n';
import type { ProductLabel } from './ProductLabels';
import { useUiLanguage } from './UiLanguageProvider';
import {
  buildHomeFeaturedProductFilters,
  HOME_FEATURED_FILTER,
  HOME_PRODUCTS_PER_PAGE,
} from '@/lib/home/home-product-filters';
import { buildProductListCacheKey } from '@/lib/shop/product-list-cache-key';
import { productFiltersToApiParams } from '@/lib/shop/product-filters-to-api-params';
import { isMarcoHostedProductImageUrl } from '@/lib/products/marco-product-image';

export interface FeaturedHomeProduct {
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
  colors?: Array<{ value: string; imageUrl?: string | null; colors?: string[] | null }>;
  sizes?: Array<{ value: string; imageUrl?: string | null }>;
  attributes?: Record<
    string,
    Array<{ valueId?: string; value: string; label: string; imageUrl?: string | null; colors?: string[] | null }>
  >;
  originalPrice?: number | null;
  discountPercent?: number | null;
  labels?: ProductLabel[];
  primaryCategoryId?: string | null;
  categoryIds?: string[];
  categories?: Array<{ id: string; slug?: string; title?: string }>;
}

interface ProductsResponse {
  data: FeaturedHomeProduct[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const FEATURED_HOME_FILTER_DEFAULT = HOME_FEATURED_FILTER;

export type UseFeaturedHomeProductsOptions = {
  initialProducts?: FeaturedHomeProduct[];
  initialFiltersKey?: string;
  serverLanguage?: LanguageCode;
};

async function fetchFeaturedHomePage(
  language: LanguageCode,
  filter: string | null,
): Promise<FeaturedHomeProduct[]> {
  const fetchByLanguage = async (requestedLanguage: LanguageCode): Promise<FeaturedHomeProduct[]> => {
    const params = productFiltersToApiParams({
      ...buildHomeFeaturedProductFilters(requestedLanguage),
      filter: filter ?? HOME_FEATURED_FILTER,
    });
    const response = await apiClient.get<ProductsResponse>('/api/v1/products', { params });
    return (response.data || []).slice(0, HOME_PRODUCTS_PER_PAGE);
  };

  const localizedProducts = await fetchByLanguage(language);
  const withoutMarco = localizedProducts.filter(
    (product) => !isMarcoHostedProductImageUrl(product.image),
  );
  if (withoutMarco.length > 0 || language === 'en') {
    return withoutMarco;
  }

  const englishProducts = await fetchByLanguage('en');
  return englishProducts.filter(
    (product) => !isMarcoHostedProductImageUrl(product.image),
  );
}

export function useFeaturedHomeProducts(options: UseFeaturedHomeProductsOptions = {}) {
  const { initialProducts, initialFiltersKey } = options;
  // Same source as header/shop cards — not useClientSyncedLanguage (SSR snapshot is always `hy`).
  const language = useUiLanguage();
  const [products, setProducts] = useState<FeaturedHomeProduct[]>(() => initialProducts ?? []);
  const [loading, setLoading] = useState(
    () => !(initialProducts && initialFiltersKey),
  );
  const [error, setError] = useState<string | null>(null);

  const filtersKey = useMemo(
    () => buildProductListCacheKey(buildHomeFeaturedProductFilters(language)),
    [language],
  );

  const fetchProducts = useCallback(
    async (filter: string | null) => {
      try {
        setLoading(true);
        setError(null);
        setProducts(await fetchFeaturedHomePage(language, filter));
      } catch (err) {
        console.error('[HomeProductSections] Error:', err);
        setError(t(language, 'home.featured_products.errorLoading'));
        setProducts([]);
      } finally {
        setLoading(false);
      }
    },
    [language],
  );

  useEffect(() => {
    if (initialFiltersKey && filtersKey === initialFiltersKey && initialProducts) {
      setProducts(initialProducts);
      setLoading(false);
      setError(null);
      return;
    }
    void fetchProducts(FEATURED_HOME_FILTER_DEFAULT);
  }, [fetchProducts, filtersKey, initialFiltersKey, initialProducts]);

  return {
    language,
    products,
    loading,
    error,
    fetchProducts,
    productsPerPage: HOME_PRODUCTS_PER_PAGE,
  };
}
