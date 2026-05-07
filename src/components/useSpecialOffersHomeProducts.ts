'use client';

import { useState, useEffect, useCallback } from 'react';
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

function isProductsResponse(value: unknown): value is ProductsResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const rawData = (value as { data?: unknown }).data;
  const rawMeta = (value as { meta?: unknown }).meta;
  return Array.isArray(rawData) && !!rawMeta && typeof rawMeta === 'object';
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
  const fetchByLanguage = async (requestedLanguage: LanguageCode): Promise<FeaturedHomeProduct[]> => {
    const searchParams = new URLSearchParams({
      page: '1',
      limit: PRODUCTS_PER_PAGE.toString(),
      lang: requestedLanguage,
    });

    if (filter) {
      searchParams.set('filter', filter);
    }

    try {
      const response = await fetch(`/api/v1/products?${searchParams.toString()}`, {
        method: 'GET',
        cache: 'no-store',
      });

      if (!response.ok) {
        return [];
      }

      const rawData: unknown = await response.json();
      if (!isProductsResponse(rawData)) {
        return [];
      }

      return rawData.data.slice(0, PRODUCTS_PER_PAGE);
    } catch {
      return [];
    }
  };

  const localizedProducts = await fetchByLanguage(language);
  if (localizedProducts.length > 0 || language === 'en') {
    return localizedProducts;
  }

  return fetchByLanguage('en');
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
