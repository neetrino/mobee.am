'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiClient } from '../lib/api-client';
import { getStoredLanguage } from '../lib/language';

export interface ColorOption {
  value: string;
  label: string;
  count: number;
  imageUrl?: string | null;
  colors?: string[] | null;
}

export interface SizeOption {
  value: string;
  count: number;
}

export interface BrandOption {
  id: string;
  name: string;
  count: number;
}

export interface PriceRangeOption {
  min: number;
  max: number;
  stepSize?: number | null;
  stepSizePerCurrency?: Record<string, number> | null;
}

export interface ProductsFiltersData {
  colors: ColorOption[];
  sizes: SizeOption[];
  brands: BrandOption[];
  priceRange: PriceRangeOption;
}

/** Top categories for shop sidebar (shared fetch, avoids duplicate /categories/top). */
export interface ShopTopCategoryOption {
  id: string;
  slug: string;
  title: string;
  productCount: number;
}

interface ProductsFiltersContextValue {
  data: ProductsFiltersData | null;
  loading: boolean;
  error: boolean;
  refetch: () => void;
  /** Loaded in parallel with filters; empty array when none or on error. */
  topCategories: ShopTopCategoryOption[];
}

const ProductsFiltersContext = createContext<ProductsFiltersContextValue | null>(null);

const DEFAULT_FILTERS: ProductsFiltersData = {
  colors: [],
  sizes: [],
  brands: [],
  priceRange: { min: 0, max: 100000, stepSize: null, stepSizePerCurrency: null },
};

interface ProductsFiltersProviderProps {
  category?: string;
  search?: string;
  minPrice?: string;
  maxPrice?: string;
  children: ReactNode;
}

export function ProductsFiltersProvider({
  category,
  search,
  minPrice,
  maxPrice,
  children,
}: ProductsFiltersProviderProps) {
  const [data, setData] = useState<ProductsFiltersData | null>(null);
  const [topCategories, setTopCategories] = useState<ShopTopCategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchFilters = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const lang = getStoredLanguage();
      const params: Record<string, string> = { lang };
      if (category) params.category = category;
      if (search) params.search = search;
      if (minPrice) params.minPrice = minPrice;
      if (maxPrice) params.maxPrice = maxPrice;

      const [filtersRes, topRes] = await Promise.all([
        apiClient.get<ProductsFiltersData>('/api/v1/products/filters', { params }),
        apiClient.get<{ data: ShopTopCategoryOption[] }>('/api/v1/categories/top', {
          params: { lang, limit: '6' },
        }),
      ]);

      setData({
        colors: filtersRes.colors ?? [],
        sizes: filtersRes.sizes ?? [],
        brands: filtersRes.brands ?? [],
        priceRange: filtersRes.priceRange ?? DEFAULT_FILTERS.priceRange,
      });
      setTopCategories(topRes.data ?? []);
    } catch {
      setError(true);
      setData(DEFAULT_FILTERS);
      setTopCategories([]);
    } finally {
      setLoading(false);
    }
  }, [category, search, minPrice, maxPrice]);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  const value = useMemo<ProductsFiltersContextValue>(
    () => ({
      data,
      loading,
      error,
      refetch: fetchFilters,
      topCategories,
    }),
    [data, loading, error, fetchFilters, topCategories]
  );

  return (
    <ProductsFiltersContext.Provider value={value}>
      {children}
    </ProductsFiltersContext.Provider>
  );
}

export function useProductsFilters(): ProductsFiltersContextValue | null {
  return useContext(ProductsFiltersContext);
}
