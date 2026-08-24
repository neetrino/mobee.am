'use client';

import { useTranslation } from '@/lib/i18n-client';
import type { ProductWarrantyYears } from '@/lib/constants/product-warranty';

type ProductWarrantyBadgeSize = 'catalog' | 'promo';

interface ProductWarrantyBadgeProps {
  years: ProductWarrantyYears;
  size?: ProductWarrantyBadgeSize;
  className?: string;
}

const SIZE_STYLES: Record<
  ProductWarrantyBadgeSize,
  { number: string; label: string; padding: string }
> = {
  catalog: {
    number: 'text-[1.125rem] leading-none',
    label: 'text-[0.625rem] leading-tight',
    padding: 'px-2 py-1.5',
  },
  promo: {
    number: 'text-[1.375rem] leading-none sm:text-[1.5rem]',
    label: 'text-[0.625rem] leading-tight sm:text-[0.6875rem]',
    padding: 'px-2.5 py-2',
  },
};

/**
 * Warranty duration pill — year count + localized «warranty» label.
 * Colors follow site brand (`admin` / `#2DB2FF`), not a separate yellow accent.
 * Render only when years is 1 | 2 | 3 (caller must gate on product.warrantyYears).
 */
export function ProductWarrantyBadge({
  years,
  size = 'catalog',
  className = '',
}: ProductWarrantyBadgeProps) {
  const { t } = useTranslation();
  const styles = SIZE_STYLES[size];

  return (
    <div
      className={`pointer-events-none inline-flex flex-col overflow-hidden rounded-xl bg-admin-900 text-center not-italic ${className}`}
      aria-label={t('products.warranty.badge_aria').replace('{years}', String(years))}
    >
      <div className={`flex items-end justify-center gap-0.5 ${styles.padding}`}>
        <span className={`font-bold uppercase text-white ${styles.number}`}>{years}</span>
        <span className="text-[0.875rem] font-normal uppercase leading-[0.9375rem] text-white">
          {t('products.warranty.years_suffix')}
        </span>
      </div>
      <div className="bg-admin px-2 py-0.5">
        <span className={`block font-bold uppercase text-white ${styles.label}`}>
          {t('products.warranty.label')}
        </span>
      </div>
    </div>
  );
}
