import type { ProductVariant } from '../types';
import { isVariantCompatible } from './variant-compatibility';

/**
 * Calculate stock for attribute value based on current selections
 * If other attributes are selected, show stock only for compatible variants
 * Otherwise, show total stock for all variants with this value
 */
export function calculateStock(
  variants: ProductVariant[],
  currentSelections: Map<string, string>,
  attrKey: string
): number {
  if (currentSelections.size > 0) {
    // Filter variants by compatibility and sum their stock
    const compatibleVariants = variants.filter((v) =>
      isVariantCompatible(v, currentSelections, attrKey)
    );
    return compatibleVariants.reduce((sum, v) => sum + v.stock, 0);
  } else {
    // No selections, show total stock
    return variants.reduce((sum, v) => sum + v.stock, 0);
  }
}




