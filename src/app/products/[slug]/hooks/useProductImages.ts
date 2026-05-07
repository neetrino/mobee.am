import { useMemo } from 'react';
import { PRODUCT_CARD_DISPLAY_IMAGE_SRC } from '../../../../lib/productCardDisplayImage';
import type { Product } from '../types';

/**
 * Product detail gallery — temporarily a single shared storefront image for all products.
 */
export function useProductImages(_product: Product | null): string[] {
  return useMemo(() => [PRODUCT_CARD_DISPLAY_IMAGE_SRC], []);
}
