/**
 * Utilities for detecting product type (simple vs variable)
 */

/**
 * Checks if variants have attributes
 */
export function hasVariantsWithAttributes(variants: unknown[]): boolean {
  if (!variants || variants.length === 0) {
    return false;
  }

  return variants.some((variant: any) => {
    if (variant.attributes && typeof variant.attributes === 'object' && Object.keys(variant.attributes).length > 0) {
      return true;
    }
    if (variant.options && Array.isArray(variant.options) && variant.options.length > 0) {
      return true;
    }
    return false;
  });
}

