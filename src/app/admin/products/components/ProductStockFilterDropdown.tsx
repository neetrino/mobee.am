'use client';

import { AdminFormSelectDropdown, type AdminFormSelectOption } from '../../components/AdminFormSelectDropdown';

export type ProductStockFilterValue = 'all' | 'inStock' | 'outOfStock';

export interface ProductStockFilterOption {
  value: ProductStockFilterValue;
  label: string;
}

interface ProductStockFilterDropdownProps {
  id: string;
  value: ProductStockFilterValue;
  options: readonly ProductStockFilterOption[];
  onChange: (next: ProductStockFilterValue) => void;
  ariaLabel: string;
}

/**
 * Mobee flyout stock filter on `/supersudo/products`.
 */
export function ProductStockFilterDropdown({
  id,
  value,
  options,
  onChange,
  ariaLabel,
}: ProductStockFilterDropdownProps) {
  const formOptions: readonly AdminFormSelectOption[] = options;

  return (
    <AdminFormSelectDropdown
      id={id}
      value={value}
      options={formOptions}
      onChange={(next) => onChange(next as ProductStockFilterValue)}
      ariaLabel={ariaLabel}
    />
  );
}
