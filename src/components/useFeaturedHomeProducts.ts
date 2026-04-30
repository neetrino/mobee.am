'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../lib/api-client';
import { getStoredLanguage, type LanguageCode } from '../lib/language';
import { t } from '../lib/i18n';
import type { ProductLabel } from './ProductLabels';

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

const PRODUCTS_PER_PAGE = 10;
export const FEATURED_HOME_FILTER_DEFAULT = 'new' as const;

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

async function fetchFeaturedHomePage(
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

export function useFeaturedHomeProducts() {
  const language = useClientSyncedLanguage();
  const [products, setProducts] = useState<FeaturedHomeProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(
    async (filter: string | null) => {
      try {
        setLoading(true);
        setError(null);
        setProducts(await fetchFeaturedHomePage(language, filter));
      } catch (err) {
        console.error("[HomeProductSections] Error:", err);
        setError(t(language, 'home.featured_products.errorLoading'));
        setProducts([]);
      } finally {
        setLoading(false);
      }
    },
    [language],
  );

  useEffect(() => {
    fetchProducts(FEATURED_HOME_FILTER_DEFAULT);
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
