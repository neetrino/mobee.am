/** Allowed warranty durations for storefront badge (years). */
export const PRODUCT_WARRANTY_YEAR_OPTIONS = [1, 2, 3] as const;

export type ProductWarrantyYears = (typeof PRODUCT_WARRANTY_YEAR_OPTIONS)[number];

/**
 * Normalizes admin/API input to 1 | 2 | 3, or null when absent or unsupported.
 */
export function normalizeProductWarrantyYears(
  value: unknown,
): ProductWarrantyYears | null {
  if (value === null || value === undefined || value === '' || value === 'none') {
    return null;
  }
  const numeric = typeof value === 'string' ? Number.parseInt(value, 10) : value;
  if (numeric === 1 || numeric === 2 || numeric === 3) {
    return numeric;
  }
  return null;
}

/** True when value is a supported warranty duration. */
export function isProductWarrantyYears(value: unknown): value is ProductWarrantyYears {
  return value === 1 || value === 2 || value === 3;
}
