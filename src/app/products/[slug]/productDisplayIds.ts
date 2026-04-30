import type { Product } from './types';

/**
 * Builds a comma-separated listing of variant IDs for PDP display (e.g. external catalog IDs).
 */
export function formatProductVariantIdsForDisplay(product: Product): string {
  const ids = product.variants.map((v) => v.id).filter((id) => id.length > 0);
  if (ids.length === 0) {
    return product.id;
  }
  return ids.join(',');
}
