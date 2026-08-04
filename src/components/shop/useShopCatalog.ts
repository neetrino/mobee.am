'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { getStoredLanguage, type LanguageCode } from '@/lib/language';
import { buildShopProductFiltersFromSearchParams } from '@/lib/shop/build-shop-product-filters';
import { buildProductListCacheKey } from '@/lib/shop/product-list-cache-key';
import { productFiltersToApiParams } from '@/lib/shop/product-filters-to-api-params';
import type { ProductListPayload } from '@/lib/services/products-list-cached';
import {
  getProductListClientCache,
  setProductListClientCache,
} from '@/lib/shop/product-list-client-cache';
import { usePrefetchAdjacentProductListPages } from './usePrefetchAdjacentProductListPages';

export interface ShopCatalogProduct {
  id: string;
  slug: string;
  title: string;
  /** Short line under title (same as home / product API list). */
  subtitle?: string | null;
  price: number;
  compareAtPrice: number | null;
  image: string | null;
  inStock: boolean;
  brand: { id: string; name: string } | null;
  defaultVariantId?: string | null;
  colors?: Array<{ value: string; linkValue?: string; imageUrl?: string | null; colors?: string[] | null }>;
  displayColor?: string | null;
  originalPrice?: number | null;
  discountPercent?: number | null;
  labels?: Array<{
    id: string;
    type: 'text' | 'percentage';
    value: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    color: string | null;
  }>;
  primaryCategoryId?: string | null;
  categoryIds?: string[];
  categories?: Array<{ id: string; slug?: string; title?: string }>;
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

function payloadToResponse(
  payload: ProductListPayload,
  fallbackLimit: number,
): ProductsResponse {
  return {
    data: payload.data ?? [],
    meta:
      payload.meta ??
      ({
        total: 0,
        page: 1,
        limit: fallbackLimit,
        totalPages: 0,
      } as ProductsResponse['meta']),
  };
}

export type UseShopCatalogOptions = {
  initialPayload?: ProductListPayload;
  initialFiltersKey?: string;
  serverLanguage?: LanguageCode;
};

export function useShopCatalog(options: UseShopCatalogOptions = {}) {
  const { initialPayload, initialFiltersKey, serverLanguage } = options;
  const searchParams = useSearchParams();
  const [language, setLanguage] = useState<LanguageCode>(() => serverLanguage ?? getStoredLanguage());
  const [productsData, setProductsData] = useState<ProductsResponse | null>(() =>
    initialPayload && initialFiltersKey
      ? payloadToResponse(initialPayload, initialPayload.meta?.limit ?? 12)
      : null,
  );
  const [loading, setLoading] = useState(() => !(initialPayload && initialFiltersKey));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const productsDataRef = useRef(productsData);
  const requestIdRef = useRef(0);

  useEffect(() => {
    productsDataRef.current = productsData;
  }, [productsData]);

  useEffect(() => {
    if (initialPayload && initialFiltersKey) {
      setProductListClientCache(initialFiltersKey, initialPayload);
    }
  }, [initialFiltersKey, initialPayload]);

  useEffect(() => {
    const onLanguageUpdate = () => setLanguage(getStoredLanguage());
    window.addEventListener('language-updated', onLanguageUpdate);
    return () => window.removeEventListener('language-updated', onLanguageUpdate);
  }, []);

  const filters = useMemo(() => {
    const record = searchParamsToRecord(searchParams);
    return buildShopProductFiltersFromSearchParams(record, language);
  }, [searchParams, language]);

  const filtersKey = useMemo(() => buildProductListCacheKey(filters), [filters]);

  const applyPayload = useCallback((payload: ProductListPayload, limit: number) => {
    setProductListClientCache(filtersKey, payload);
    setProductsData(payloadToResponse(payload, limit));
    setLoading(false);
    setRefreshing(false);
    setError(false);
  }, [filtersKey]);

  const fetchList = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const cached = getProductListClientCache(filtersKey);
    if (cached) {
      applyPayload(cached, filters.limit ?? 12);
      return;
    }

    const hasVisibleRows = (productsDataRef.current?.data?.length ?? 0) > 0;
    if (hasVisibleRows) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(false);

    try {
      const params = productFiltersToApiParams(filters);
      const result = await apiClient.get<ProductsResponse>('/api/v1/products', { params });
      if (requestId !== requestIdRef.current) {
        return;
      }
      const payload: ProductListPayload = {
        data: result.data ?? [],
        meta: result.meta ?? {
          total: 0,
          page: 1,
          limit: filters.limit ?? 12,
          totalPages: 0,
        },
      };
      applyPayload(payload, filters.limit ?? 12);
    } catch (e) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      console.error('❌ [SHOP CATALOG]', e);
      setError(true);
      if (!hasVisibleRows) {
        setProductsData({
          data: [],
          meta: {
            total: 0,
            page: 1,
            limit: filters.limit ?? 12,
            totalPages: 0,
          },
        });
      }
      setLoading(false);
      setRefreshing(false);
    }
  }, [applyPayload, filters, filtersKey]);

  useEffect(() => {
    if (initialFiltersKey && filtersKey === initialFiltersKey && initialPayload) {
      applyPayload(initialPayload, filters.limit ?? 12);
      return;
    }

    const cached = getProductListClientCache(filtersKey);
    if (cached) {
      applyPayload(cached, filters.limit ?? 12);
      return;
    }

    void fetchList();
  }, [applyPayload, fetchList, filters.limit, filtersKey, initialFiltersKey, initialPayload]);

  usePrefetchAdjacentProductListPages(filters, productsData?.meta);

  return { productsData, loading, refreshing, error, refetch: fetchList, filters };
}
