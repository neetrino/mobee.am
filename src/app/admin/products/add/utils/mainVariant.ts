import type { GeneratedVariant } from '../types';

/**
 * Marks one variant as main (or clears it); a product has at most one main variant.
 */
export function setMainVariant(
  variants: GeneratedVariant[],
  variantId: string,
  isMain: boolean
): GeneratedVariant[] {
  return variants.map((variant) => ({
    ...variant,
    isMain: isMain && variant.id === variantId,
  }));
}
