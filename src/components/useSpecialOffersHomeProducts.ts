'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../lib/api-client';
import { getStoredLanguage, type LanguageCode } from '../lib/language';
import { t } from '../lib/i18n';
import type { FeaturedHomeProduct } from './useFeaturedHomeProducts';

interface ProductsResponse {
  data: FeaturedHomeProduct[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const PRODUCTS_PER_PAGE = 10;
/** Store “featured” products for the home special-offers row (distinct from best-choice `new`). */
export const SPECIAL_OFFERS_HOME_FILTER_DEFAULT = 'featured' as const;

function useClientSyncedLanguage(): LanguageCode {
  const [language, setLanguage] = useState<LanguageCode>('en');
  useEffect(() => {
    const sync = () => setLanguage(getStoredLanguage());
    sync();
    window.addEventListener('language-updated', sync);
    return () => window.removeEventListener('language-updated', sync);
  }, []);
  return language;
}

async function fetchSpecialOffersHomePage(
  language: LanguageCode,
  filter: string | null,
): Promise<FeaturedHomeProduct[]> {
  const params: Record<string, string> = {
    page: '1',
    limit: PRODUCTS_PER_PAGE.toString(),
    lang: language,
  };
  if (filter) params.filter = filter;
  const response = await apiClient.get<ProductsResponse>('/api/v1/products', { params });
  return (response.data || []).slice(0, PRODUCTS_PER_PAGE);
}

export function useSpecialOffersHomeProducts() {
  const language = useClientSyncedLanguage();
  const [products, setProducts] = useState<FeaturedHomeProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    fetchProducts(SPECIAL_OFFERS_HOME_FILTER_DEFAULT);
  }, [fetchProducts]);

  return {
    language,
    products,
    loading,
    error,
    fetchProducts,
    productsPerPage: PRODUCTS_PER_PAGE,
  };
}
