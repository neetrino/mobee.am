'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { getStoredLanguage, type LanguageCode } from '@/lib/language';
import { buildShopProductFiltersFromSearchParams } from '@/lib/shop/build-shop-product-filters';
import { productFiltersToApiParams } from '@/lib/shop/product-filters-to-api-params';

export interface ShopCatalogProduct {
  id: string;
  slug: string;
  title: string;
  price: number;
  compareAtPrice: number | null;
  image: string | null;
  inStock: boolean;
  brand: { id: string; name: string } | null;
  defaultVariantId?: string | null;
  colors?: Array<{ value: string; imageUrl?: string | null; colors?: string[] | null }>;
  originalPrice?: number | null;
  labels?: Array<{
    id: string;
    type: 'text' | 'percentage';
    value: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    color: string | null;
  }>;
}

interface ProductsResponse {
  data: ShopCatalogProduct[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

function searchParamsToRecord(sp: URLSearchParams): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  sp.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

export function useShopCatalog() {
  const searchParams = useSearchParams();
  const [language, setLanguage] = useState<LanguageCode>('en');
  const [productsData, setProductsData] = useState<ProductsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const sync = () => setLanguage(getStoredLanguage());
    sync();
    window.addEventListener('language-updated', sync);
    return () => window.removeEventListener('language-updated', sync);
  }, []);

  const filters = useMemo(() => {
    const record = searchParamsToRecord(searchParams);
    return buildShopProductFiltersFromSearchParams(record, language);
  }, [searchParams, language]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = productFiltersToApiParams(filters);
      const result = await apiClient.get<ProductsResponse>('/api/v1/products', { params });
      setProductsData({
        data: result.data ?? [],
        meta: result.meta ?? {
          total: 0,
          page: 1,
          limit: filters.limit ?? 12,
          totalPages: 0,
        },
      });
    } catch (e) {
      console.error('❌ [SHOP CATALOG]', e);
      setError(true);
      setProductsData({
        data: [],
        meta: {
          total: 0,
          page: 1,
          limit: filters.limit ?? 12,
          totalPages: 0,
        },
      });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  return { productsData, loading, error, refetch: fetchList, filters };
}
