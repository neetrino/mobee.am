'use client';

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
  const { t } = useTranslation();

  return (
    <div className="mx-auto w-full px-0 pt-1 pb-2 sm:pt-6 sm:pb-4">
      {/* Desktop */}
      <div className="hidden sm:flex sm:items-center sm:gap-6">
        <h1 className="text-xl font-bold text-gray-900">
          {t('products.header.allProducts').replace(
            '{total}',
            isCountPending ? '…' : total.toString(),
          )}
        </h1>
      </div>

      {/* Mobile */}
      <div className="sm:hidden">
        <h1 className="text-2xl font-bold leading-snug text-gray-900">
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

