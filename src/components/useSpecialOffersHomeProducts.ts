'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '../lib/api-client';
import { type LanguageCode } from '../lib/language';
import { useClientSyncedLanguage } from '../lib/useClientSyncedLanguage';
import { t } from '../lib/i18n';
import type { FeaturedHomeProduct } from './useFeaturedHomeProducts';
import {
  buildHomeSpecialOffersProductFilters,
  HOME_PRODUCTS_PER_PAGE,
  HOME_SPECIAL_OFFERS_FILTER,
} from '@/lib/home/home-product-filters';
import { buildProductListCacheKey } from '@/lib/shop/product-list-cache-key';
import { productFiltersToApiParams } from '@/lib/shop/product-filters-to-api-params';

interface ProductsResponse {
  data: FeaturedHomeProduct[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/** Store “featured” products for the home special-offers row (distinct from best-choice `new`). */
export const SPECIAL_OFFERS_HOME_FILTER_DEFAULT = HOME_SPECIAL_OFFERS_FILTER;

export type UseSpecialOffersHomeProductsOptions = {
  initialProducts?: FeaturedHomeProduct[];
  initialFiltersKey?: string;
  serverLanguage?: LanguageCode;
};

async function fetchSpecialOffersHomePage(
  language: LanguageCode,
  filter: string | null,
): Promise<FeaturedHomeProduct[]> {
  const fetchByLanguage = async (requestedLanguage: LanguageCode): Promise<FeaturedHomeProduct[]> => {
    const params = productFiltersToApiParams({
      ...buildHomeSpecialOffersProductFilters(requestedLanguage),
      filter: filter ?? HOME_SPECIAL_OFFERS_FILTER,
    });
    const response = await apiClient.get<ProductsResponse>('/api/v1/products', { params });
    return (response.data || []).slice(0, HOME_PRODUCTS_PER_PAGE);
  };

  const localizedProducts = await fetchByLanguage(language);
  if (localizedProducts.length > 0 || language === 'en') {
    return localizedProducts;
  }

  return fetchByLanguage('en');
}

export function useSpecialOffersHomeProducts(options: UseSpecialOffersHomeProductsOptions = {}) {
  const { initialProducts, initialFiltersKey } = options;
  const language = useClientSyncedLanguage();
  const [products, setProducts] = useState<FeaturedHomeProduct[]>(() => initialProducts ?? []);
  const [loading, setLoading] = useState(
    () => !(initialProducts && initialFiltersKey),
  );
  const [error, setError] = useState<string | null>(null);

  const filtersKey = useMemo(
    () => buildProductListCacheKey(buildHomeSpecialOffersProductFilters(language)),
    [language],
  );

  const fetchProducts = useCallback(
    async (filter: string | null) => {
      try {
        setLoading(true);
        setError(null);
        setProducts(await fetchSpecialOffersHomePage(language, filter));
      } catch (err) {
        console.error('[SpecialOffersHome] Error:', err);
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
    void fetchProducts(SPECIAL_OFFERS_HOME_FILTER_DEFAULT);
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
