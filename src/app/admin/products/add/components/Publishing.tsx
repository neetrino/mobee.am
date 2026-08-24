'use client';

import { useTranslation } from '../../../../../lib/i18n-client';
import type { ProductWarrantyYears } from '@/lib/constants/product-warranty';
import { ProductWarrantySelect } from './ProductWarrantySelect';

interface PublishingProps {
  featured: boolean;
  onFeaturedChange: (featured: boolean) => void;
  warrantyYears: ProductWarrantyYears | null;
  onWarrantyYearsChange: (years: ProductWarrantyYears | null) => void;
}

export function Publishing({
  featured,
  onFeaturedChange,
  warrantyYears,
  onWarrantyYearsChange,
}: PublishingProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-1 text-sm font-semibold text-gray-900">
          {t('admin.products.add.productWarranty')}
        </h3>
        <p className="mb-3 text-xs text-gray-500">{t('admin.products.add.productWarrantyHint')}</p>
        <ProductWarrantySelect warrantyYears={warrantyYears} onChange={onWarrantyYearsChange} />
      </div>
      <div className="space-y-2">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={featured}
            onChange={(e) => onFeaturedChange(e.target.checked)}
            className="mr-2"
          />
          <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
            <span aria-hidden="true">⭐</span>
            {t('admin.products.add.markAsFeatured')}
          </span>
        </label>
      </div>
    </div>
  );
}
