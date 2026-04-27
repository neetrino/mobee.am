'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useTranslation } from '../lib/i18n-client';

interface ProductsHeaderProps {
  /**
   * Ընդհանուր ապրանքների քանակը՝ բոլոր էջերում (from API meta.total)
   */
  total: number;
  /** When true, total count is not yet loaded (client fetch). */
  isCountPending?: boolean;
}

function ProductsHeaderContent({ total, isCountPending }: ProductsHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  // Per page: default 12 when not in URL (proper pagination)
  const hasActiveFilters = (() => {
    const filterKeys = ['search', 'category', 'minPrice', 'maxPrice', 'colors', 'sizes', 'brand'];
    return filterKeys.some((key) => !!searchParams.get(key));
  })();

  const handleClearFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    const filterKeys = ['search', 'category', 'minPrice', 'maxPrice', 'colors', 'sizes', 'brand'];

    filterKeys.forEach((key) => params.delete(key));
    // Reset page when filters are cleared
    params.delete('page');

    const queryString = params.toString();
    router.push(queryString ? `/shop?${queryString}` : '/shop');
  };

  return (
    <div className="mx-auto w-full px-0 pt-6 pb-4">
      {/* Desktop */}
      <div className="hidden sm:flex sm:items-center sm:gap-6">
        <div className="flex items-center gap-6">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center gap-2 text-sm text-gray-900 hover:text-gray-700 transition-colors"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-gray-900"
              >
                <path
                  d="M12 4L4 12M4 4L12 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>{t('products.header.clearFilters')}</span>
            </button>
          )}
          
          <h1 className="text-xl font-bold text-gray-900">
            {t('products.header.allProducts').replace(
              '{total}',
              isCountPending ? '…' : total.toString(),
            )}
          </h1>
        </div>
      </div>

      {/* Mobile */}
      <div className="sm:hidden">
        <h1 className="text-lg font-bold text-gray-900">
          {t('products.header.allProducts').replace(
            '{total}',
            isCountPending ? '…' : total.toString(),
          )}
        </h1>
      </div>
    </div>
  );
}

export function ProductsHeader(props: ProductsHeaderProps) {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-4">
        <div className="flex justify-end items-center">
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    }>
      <ProductsHeaderContent {...props} />
    </Suspense>
  );
}

