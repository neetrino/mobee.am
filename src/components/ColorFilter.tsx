'use client';

import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '../lib/api-client';
import { getStoredLanguage } from '../lib/language';
import { getColorHex } from '../lib/colorMap';
import { useTranslation } from '../lib/i18n-client';
import { useProductsFilters } from './ProductsFiltersProvider';

interface ColorFilterProps {
  category?: string;
  search?: string;
  minPrice?: string;
  maxPrice?: string;
  selectedColors?: string[];
}

interface ColorOption {
  value: string;
  label: string;
  count: number;
  imageUrl?: string | null;
  colors?: string[] | null;
}

export function ColorFilter({ category, search, minPrice, maxPrice, selectedColors = [] }: ColorFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filtersContext = useProductsFilters();
  const { t } = useTranslation();
  const [colors, setColors] = useState<ColorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>(selectedColors);

  useEffect(() => {
    if (filtersContext?.data?.colors) {
      setColors(filtersContext.data.colors);
      setLoading(false);
      return;
    }
    if (filtersContext === null) {
      fetchColors();
    } else {
      setLoading(filtersContext.loading);
    }
  }, [category, search, minPrice, maxPrice, filtersContext?.data?.colors, filtersContext?.loading, filtersContext === null]);

  useEffect(() => {
    setSelected(selectedColors);
  }, [selectedColors]);

  const fetchColors = async () => {
    try {
      setLoading(true);
      const language = getStoredLanguage();
      const params: Record<string, string> = {
        lang: language,
      };
      
      if (category) params.category = category;
      if (search) params.search = search;
      if (minPrice) params.minPrice = minPrice;
      if (maxPrice) params.maxPrice = maxPrice;

      // Fetch filters from API
      const response = await apiClient.get<{ colors: ColorOption[]; sizes: unknown[] }>('/api/v1/products/filters', { params });
      
      setColors(response.colors || []);
    } catch (error) {
      setColors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleColorToggle = (colorValue: string) => {
    const newSelected = selected.includes(colorValue)
      ? selected.filter((c) => c !== colorValue)
      : [...selected, colorValue];

    setSelected(newSelected);
    applyFilters(newSelected);
  };

  const applyFilters = (colorsToApply: string[]) => {
    // Ստեղծում ենք նոր URLSearchParams URL-ի հիման վրա, որպեսզի պահպանենք բոլոր params-ները
    const params = new URLSearchParams(searchParams.toString());
    
    // Թարմացնում ենք colors պարամետրը
    if (colorsToApply.length > 0) {
      params.set('colors', colorsToApply.join(','));
    } else {
      params.delete('colors');
    }
    
    // Reset page to 1 when filters change
    params.delete('page');

    router.push(`/shop?${params.toString()}`);
  };

  if (loading && colors.length === 0) {
    return (
      <section className="border-b border-[#E2E8F0] pb-6">
        <h3 className="text-base font-semibold leading-6 tracking-[-0.02em] text-[#1D293D]">
          {t('products.filters.color.title')}
        </h3>
        <div className="mt-3 text-sm text-gray-500">{t('products.filters.color.loading')}</div>
      </section>
    );
  }

  return (
    <section className="border-b border-[#E2E8F0] pb-6">
      <h3 className="text-base font-semibold leading-6 tracking-[-0.02em] text-[#1D293D]">
        {t('products.filters.color.title')}
      </h3>
      {colors.length === 0 ? (
        <div className="text-sm text-gray-500 py-4 text-center">
          {t('products.filters.color.noColors')}
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-5 gap-x-[22px] gap-y-4">
          {colors.map((color) => {
            const isSelected = selected.includes(color.value);
            // Determine color hex: use colors[0] if available, otherwise use getColorHex
            const colorHex = color.colors && Array.isArray(color.colors) && color.colors.length > 0 
              ? color.colors[0] 
              : getColorHex(color.label);
            const hasImage = color.imageUrl && color.imageUrl.trim() !== '';

            return (
              <button
                key={color.value}
                type="button"
                onClick={() => handleColorToggle(color.value)}
                aria-pressed={isSelected}
                className={`h-8 w-8 rounded-full border transition ${
                  isSelected
                    ? 'border-[#2CA1E2] ring-2 ring-[#2CA1E2]/30'
                    : 'border-transparent hover:border-[#2CA1E2] hover:ring-2 hover:ring-[#2CA1E2]/25'
                }`}
                title={color.label}
              >
                <span
                  className="sr-only"
                >
                  {color.label}
                </span>
                <div
                  className="relative h-8 w-8 overflow-hidden rounded-full border border-[#CAD5E2]"
                  style={hasImage ? {} : { backgroundColor: colorHex }}
                  aria-hidden
                >
                  {hasImage ? (
                    <img
                      src={color.imageUrl!}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.backgroundColor = colorHex;
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : null}
                  {isSelected ? (
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#2CA1E2] bg-white shadow-sm">
                        <Check className="h-3.5 w-3.5 text-[#2CA1E2]" strokeWidth={2.5} aria-hidden />
                      </span>
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

