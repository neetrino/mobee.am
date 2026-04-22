'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '../lib/api-client';
import { getStoredLanguage } from '../lib/language';
import { useTranslation } from '../lib/i18n-client';

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
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTopCategories() {
      try {
        const lang = getStoredLanguage();
        const response = await apiClient.get<CategoriesResponse>('/api/v1/categories/top', {
          params: { lang, limit: '6' },
        });
        setCategories(response.data ?? []);
      } catch {
        setCategories([]);
      } finally {
        setLoading(false);
      }
    }

    fetchTopCategories();
  }, [search, minPrice, maxPrice]);

  const toggleCategory = (slug: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (currentCategory === slug) {
      params.delete('category');
    } else {
      params.set('category', slug);
    }
    params.delete('page');
    router.push(`/products?${params.toString()}`);
  };

  if (loading || categories.length === 0) {
    return null;
  }

  return (
    <section className="border-b border-[#E2E8F0] pb-6">
      <h3 className="text-base font-semibold leading-6 tracking-[-0.02em] text-[#111827]">
        {t('products.filters.category.title')}
      </h3>

      <div className="mt-4 space-y-3">
        {categories.map((category) => {
          const selected = currentCategory === category.slug;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => toggleCategory(category.slug)}
              className="flex w-full items-center gap-3 text-left"
            >
              <span
                className={`h-5 w-5 rounded border-2 ${selected ? 'border-[#2CA1E2] bg-[#2CA1E2]' : 'border-[#CAD5E2] bg-white'}`}
                aria-hidden
              />
              <span className="flex-1 truncate text-base leading-6 tracking-[-0.02em] text-[#314158]">
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
