'use client';

import { PRODUCT_WARRANTY_YEAR_OPTIONS, type ProductWarrantyYears } from '@/lib/constants/product-warranty';
import { useTranslation } from '@/lib/i18n-client';

type WarrantySelection = ProductWarrantyYears | null;
type WarrantyOptionId = 'none' | `${ProductWarrantyYears}`;

interface ProductWarrantySelectProps {
  warrantyYears: WarrantySelection;
  onChange: (years: WarrantySelection) => void;
}

const OPTION_LABEL_KEYS: Record<WarrantyOptionId, string> = {
  none: 'admin.products.add.productWarrantyNone',
  1: 'admin.products.add.productWarrantyOneYear',
  2: 'admin.products.add.productWarrantyTwoYears',
  3: 'admin.products.add.productWarrantyThreeYears',
};

/**
 * Admin warranty selector — No warranty | 1 | 2 | 3 years.
 */
export function ProductWarrantySelect({ warrantyYears, onChange }: ProductWarrantySelectProps) {
  const { t } = useTranslation();
  const selectedValue: WarrantyOptionId =
    warrantyYears === null ? 'none' : (String(warrantyYears) as WarrantyOptionId);

  const options: Array<{ id: WarrantyOptionId; label: string }> = [
    { id: 'none', label: t(OPTION_LABEL_KEYS.none) },
    ...PRODUCT_WARRANTY_YEAR_OPTIONS.map((years) => ({
      id: String(years) as WarrantyOptionId,
      label: t(OPTION_LABEL_KEYS[years]),
    })),
  ];

  return (
    <div
      className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      role="radiogroup"
      aria-label={t('admin.products.add.productWarranty')}
    >
      {options.map((option) => {
        const isSelected = selectedValue === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => {
              if (option.id === 'none') {
                onChange(null);
                return;
              }
              const parsed = Number.parseInt(option.id, 10);
              if (PRODUCT_WARRANTY_YEAR_OPTIONS.includes(parsed as ProductWarrantyYears)) {
                onChange(parsed as ProductWarrantyYears);
              }
            }}
            className={`rounded-lg border px-2 py-2 text-center text-xs font-medium transition-colors sm:text-sm ${
              isSelected
                ? 'border-gray-900 bg-gray-900 text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
