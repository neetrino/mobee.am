'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '../lib/api-client';
import { getStoredLanguage } from '../lib/language';
import { useTranslation } from '../lib/i18n-client';
import { useProductsFilters } from './ProductsFiltersProvider';

interface CategoryFilterProps {
  currentCategory?: string;
  search?: string;
  minPrice?: string;
  maxPrice?: string;
}

interface CategoryOption {
  id: string;
  slug: string;
  title: string;
  productCount: number;
}

interface CategoriesResponse {
  data: CategoryOption[];
}

export function CategoryFilter({
  currentCategory,
  search,
  minPrice,
  maxPrice,
}: CategoryFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const filtersCtx = useProductsFilters();
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(currentCategory);

  useEffect(() => {
    setSelectedCategory(currentCategory);
  }, [currentCategory]);

  useEffect(() => {
    if (filtersCtx !== null) {
      setLoading(filtersCtx.loading);
      if (!filtersCtx.loading) {
        setCategories(filtersCtx.topCategories);
      }
      return;
    }

    let cancelled = false;
    async function fetchTopCategories() {
      try {
        const lang = getStoredLanguage();
        const response = await apiClient.get<CategoriesResponse>('/api/v1/categories/top', {
          params: { lang, limit: '6' },
        });
        if (!cancelled) {
          setCategories(response.data ?? []);
        }
      } catch {
        if (!cancelled) {
          setCategories([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchTopCategories();
    return () => {
      cancelled = true;
    };
  }, [filtersCtx, filtersCtx?.loading, filtersCtx?.topCategories, search, minPrice, maxPrice]);

  const toggleCategory = (slug: string) => {
    const nextCategory = selectedCategory === slug ? undefined : slug;
    setSelectedCategory(nextCategory);

    const params = new URLSearchParams(searchParams.toString());
    if (nextCategory === undefined) {
      params.delete('category');
    } else {
      params.set('category', nextCategory);
    }
    params.delete('page');
    router.push(`/shop?${params.toString()}`);
  };

  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="border-b border-[#E2E8F0] pb-6">
      <h3 className="text-base font-semibold leading-6 tracking-[-0.02em] text-[#111827]">
        {t('products.filters.category.title')}
      </h3>

      <div className="mt-4 space-y-3">
        {categories.map((category) => {
          const selected = selectedCategory === category.slug;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => toggleCategory(category.slug)}
              className="group -mx-2 flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-[#EFF6FF]"
            >
              <span
                className={`h-5 w-5 shrink-0 rounded border-2 transition-colors ${
                  selected
                    ? 'border-[#2CA1E2] bg-[#2CA1E2]'
                    : 'border-[#CAD5E2] bg-white group-hover:border-[#2CA1E2]'
                }`}
                aria-hidden
              />
              <span className="flex-1 truncate text-base leading-6 tracking-[-0.02em] text-[#314158] transition-colors group-hover:text-[#0F172B]">
                {category.title}
              </span>
              <span className="text-base leading-6 tracking-[-0.02em] text-[#90A1B9]">
                ({category.productCount})
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
