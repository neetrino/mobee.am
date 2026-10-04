'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/lib/i18n/navigation';
import { getStoredLanguage } from '@/lib/language';
import { useTranslation } from '@/lib/i18n-client';
import { useProductsFilters } from './ProductsFiltersProvider';
import { ShopFilterSectionHeader } from './shop/ShopFilterSectionHeader';
import { warmShopNavigationFromSearchParams } from '@/lib/navigation/storefront-prefetch';

interface SizeFilterProps {
  selectedSizes?: string[];
}

interface SizeOption {
  value: string;
  count: number;
}

export function SizeFilter({ selectedSizes = [] }: SizeFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filtersContext = useProductsFilters();
  const { t } = useTranslation();
  const [sizes, setSizes] = useState<SizeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>(selectedSizes);

  useEffect(() => {
    setSelected(selectedSizes);
  }, [selectedSizes]);

  useEffect(() => {
    if (filtersContext?.data?.sizes) {
      setSizes(filtersContext.data.sizes.filter((item) => item.count > 0));
      setLoading(false);
      return;
    }
    if (filtersContext === null) {
      setSizes([]);
      setLoading(false);
      return;
    }
    setLoading(filtersContext.loading);
  }, [filtersContext?.data?.sizes, filtersContext?.loading, filtersContext]);

  const applySizes = (next: string[]) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next.length > 0) {
      params.set('sizes', next.join(','));
    } else {
      params.delete('sizes');
    }
    params.delete('page');
    const href = warmShopNavigationFromSearchParams(router, params, getStoredLanguage());
    router.push(href);
  };

  const handleToggle = (sizeValue: string) => {
    const next = selected.includes(sizeValue)
      ? selected.filter((item) => item !== sizeValue)
      : [...selected, sizeValue];
    setSelected(next);
    applySizes(next);
  };

  const clearSizes = () => {
    setSelected([]);
    applySizes([]);
  };

  if (loading && sizes.length === 0) {
    return (
      <section className="border-b border-[#E2E8F0] pb-6">
        <ShopFilterSectionHeader
          title={t('products.filters.size.title')}
          showClear={selected.length > 0}
          onClear={clearSizes}
        />
        <div className="mt-3 text-sm text-gray-500">{t('products.filters.size.loading')}</div>
      </section>
    );
  }

  if (sizes.length === 0) {
    return null;
  }

  return (
    <section className="border-b border-[#E2E8F0] pb-6">
      <ShopFilterSectionHeader
        title={t('products.filters.size.title')}
        showClear={selected.length > 0}
        onClear={clearSizes}
      />
      <div className="mt-4 space-y-3">
        {sizes.map((size) => {
          const isSelected = selected.includes(size.value);
          return (
            <button
              key={size.value}
              type="button"
              onClick={() => handleToggle(size.value)}
              className="group -mx-2 flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-[#EFF6FF]"
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                  isSelected
                    ? 'border-[#2CA1E2] bg-white'
                    : 'border-[#CAD5E2] bg-white group-hover:border-[#2CA1E2]'
                }`}
                aria-hidden
              >
                {isSelected ? (
                  <Check className="h-4 w-4 text-[#2CA1E2]" strokeWidth={2.5} aria-hidden />
                ) : null}
              </span>
              <span className="flex-1 truncate text-base leading-6 tracking-[-0.02em] text-[#314158] transition-colors group-hover:text-[#0F172B]">
                {size.value}
              </span>
              <span className="text-base leading-6 tracking-[-0.02em] text-[#90A1B9]">
                ({size.count})
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
