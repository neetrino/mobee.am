'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '../lib/api-client';
import { getStoredLanguage } from '../lib/language';
import { useTranslation } from '../lib/i18n-client';
import { useProductsFilters } from './ProductsFiltersProvider';

interface BrandFilterProps {
  category?: string;
  search?: string;
  minPrice?: string;
  maxPrice?: string;
  selectedBrands?: string[];
}

interface BrandOption {
  id: string;
  name: string;
  count: number;
}

export function BrandFilter({ category, search, minPrice, maxPrice, selectedBrands = [] }: BrandFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filtersContext = useProductsFilters();
  const { t } = useTranslation();
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>(selectedBrands);

  useEffect(() => {
    setSelected(selectedBrands);
  }, [selectedBrands]);

  useEffect(() => {
    if (filtersContext?.data?.brands) {
      setBrands(filtersContext.data.brands);
      setLoading(false);
      return;
    }
    if (filtersContext === null) {
      fetchBrands();
    } else {
      setLoading(filtersContext.loading);
    }
  }, [category, search, minPrice, maxPrice, filtersContext?.data?.brands, filtersContext?.loading, filtersContext === null]);

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const language = getStoredLanguage();
      const params: Record<string, string> = { lang: language };
      if (category) params.category = category;
      if (search) params.search = search;
      if (minPrice) params.minPrice = minPrice;
      if (maxPrice) params.maxPrice = maxPrice;
      const response = await apiClient.get<{ brands: BrandOption[] }>('/api/v1/products/filters', { params });
      const list = response.brands ?? [];
      setBrands(list);
    } catch (err) {
      setBrands([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBrandSelect = (brandId: string) => {
    const currentBrands = selected;
    const newBrands = currentBrands.includes(brandId)
      ? currentBrands.filter((id) => id !== brandId)
      : [...currentBrands, brandId];

    setSelected(newBrands);

    const params = new URLSearchParams(searchParams.toString());
    if (newBrands.length > 0) {
      params.set('brand', newBrands.join(','));
    } else {
      params.delete('brand');
    }
    params.delete('page');
    router.push(`/shop?${params.toString()}`);
  };

  if (loading && brands.length === 0) {
    return (
      <section className="border-b border-[#E2E8F0] pb-6">
        <h3 className="text-base font-semibold leading-6 tracking-[-0.02em] text-[#1D293D]">
          {t('products.filters.brand.title')}
        </h3>
        <div className="mt-3 text-sm text-gray-500">{t('products.filters.brand.loading')}</div>
      </section>
    );
  }

  if (brands.length === 0) {
    return null;
  }

  return (
    <section className="border-b border-[#E2E8F0] pb-6">
      <h3 className="text-base font-semibold leading-6 tracking-[-0.02em] text-[#1D293D]">
        {t('products.filters.brand.title')}
      </h3>

      {brands.length > 0 ? (
        <div className="mt-4 space-y-3">
          {brands.map((brand) => {
            const isSelected = selected.includes(brand.id);

            return (
              <button
                key={brand.id}
                type="button"
                onClick={() => handleBrandSelect(brand.id)}
                className="group -mx-2 flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-[#EFF6FF]"
              >
                <span
                  className={`h-5 w-5 shrink-0 rounded border-2 transition-colors ${
                    isSelected
                      ? 'border-[#2CA1E2] bg-[#2CA1E2]'
                      : 'border-[#CAD5E2] bg-white group-hover:border-[#2CA1E2]'
                  }`}
                  aria-hidden
                >
                </span>
                <span className="flex-1 truncate text-base leading-6 tracking-[-0.02em] text-[#314158] transition-colors group-hover:text-[#0F172B]">
                  {brand.name}
                </span>
                <span
                  className="text-base leading-6 tracking-[-0.02em] text-[#90A1B9]"
                >
                  ({brand.count})
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="text-sm text-gray-500 py-4 text-center">
          {t('products.filters.brand.noBrands')}
        </div>
      )}
    </section>
  );
}

