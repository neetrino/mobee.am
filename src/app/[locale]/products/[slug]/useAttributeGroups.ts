import { useMemo } from 'react';
import type { Product, AttributeGroupValue } from './types';
import { buildGroupsFromProductAttributes } from './utils/build-attribute-groups-new';
import { buildGroupsFromVariants } from './utils/build-attribute-groups-old';

interface UseAttributeGroupsProps {
  product: Product | null;
  selectedColor: string | null;
  selectedSize: string | null;
  selectedAttributeValues: Map<string, string>;
}

/**
 * Build attribute groups from productAttributes (new format) or from variants (old format)
 * This useMemo ensures attribute groups are recalculated when product or selectedVariant changes
 */
export function useAttributeGroups({
  product,
  selectedColor,
  selectedSize,
  selectedAttributeValues,
}: UseAttributeGroupsProps): Map<string, AttributeGroupValue[]> {
  return useMemo(() => {
    const groups = new Map<string, AttributeGroupValue[]>();

    if (!product) {
      return groups;
    }

    if (product.productAttributes && product.productAttributes.length > 0) {
      // New format: Use productAttributes
      const newFormatGroups = buildGroupsFromProductAttributes({
        product,
        selectedColor,
        selectedSize,
        selectedAttributeValues,
      });
      newFormatGroups.forEach((values, key) => {
        groups.set(key, values);
      });
    } else {
      // Old format: Extract from variants
      const oldFormatGroups = buildGroupsFromVariants({
        product,
        selectedColor,
        selectedSize,
        selectedAttributeValues,
      });
      oldFormatGroups.forEach((values, key) => {
        groups.set(key, values);
      });
    }

    return groups;
  }, [product, selectedColor, selectedSize, selectedAttributeValues]);
}
