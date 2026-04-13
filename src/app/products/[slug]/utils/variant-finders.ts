import type { Product, ProductVariant, VariantOption } from '../types';
import { variantHasColor } from './variant-helpers';
import { getOptionValue } from './variant-helpers';

/**
 * Find variant by color and size
 * @param product - Product to search in
 * @param color - Color value to match
 * @param size - Size value to match
 * @returns Matching variant or null
 */
export function findVariantByColorAndSize(
  product: Product | null,
  color: string | null,
  size: string | null
): ProductVariant | null {
  if (!product?.variants || product.variants.length === 0) return null;

  const normalizedColor = color?.toLowerCase().trim();
  const normalizedSize = size?.toLowerCase().trim();

  // 1. Try exact match (Case-insensitive)
  // IMPORTANT: Use variantHasColor to check ALL color options, not just the first one
  if (normalizedColor && normalizedSize) {
    const variant = product.variants.find((v) => {
      const hasColor = variantHasColor(v, normalizedColor);
      const vSize = getOptionValue(v.options, 'size');
      return hasColor && vSize === normalizedSize;
    });
    if (variant) return variant;
  }

  // 2. If color selected but no exact match with size, find any variant of this color
  if (normalizedColor) {
    // Prefer in-stock variant of this color
    // IMPORTANT: Use variantHasColor to check ALL color options
    const colorVariants = product.variants.filter((v) =>
      variantHasColor(v, normalizedColor)
    );

    if (colorVariants.length > 0) {
      return colorVariants.find((v) => v.stock > 0) || colorVariants[0];
    }
  }

  // 3. If only size selected or fallback for size
  if (normalizedSize) {
    const sizeVariants = product.variants.filter((v) => {
      const vSize = getOptionValue(v.options, 'size');
      return vSize === normalizedSize;
    });

    if (sizeVariants.length > 0) {
      return sizeVariants.find((v) => v.stock > 0) || sizeVariants[0];
    }
  }

  // 4. Ultimate fallback
  return product.variants.find((v) => v.stock > 0) || product.variants[0] || null;
}

/**
 * Find variant by all selected attributes (color, size, and other attributes)
 * This function considers all selected attribute values to find the best matching variant
 * @param product - Product to search in
 * @param color - Color value to match
 * @param size - Size value to match
 * @param otherAttributes - Map of other attribute key-value pairs
 * @returns Matching variant or null
 */
export function findVariantByAllAttributes(
  product: Product | null,
  color: string | null,
  size: string | null,
  otherAttributes: Map<string, string>
): ProductVariant | null {
  if (!product?.variants || product.variants.length === 0) return null;

  const normalizedColor = color?.toLowerCase().trim();
  const normalizedSize = size?.toLowerCase().trim();

  // Build a map of all selected attributes (including color and size)
  const allSelectedAttributes = new Map<string, string>();
  if (normalizedColor) allSelectedAttributes.set('color', normalizedColor);
  if (normalizedSize) allSelectedAttributes.set('size', normalizedSize);
  otherAttributes.forEach((value, key) => {
    if (key !== 'color' && key !== 'size') {
      allSelectedAttributes.set(key, value.toLowerCase().trim());
    }
  });

  // Helper to check if a variant matches all selected attributes
  const variantMatches = (variant: ProductVariant): boolean => {
    // Check color - IMPORTANT: Use variantHasColor to check ALL color options
    if (normalizedColor) {
      if (!variantHasColor(variant, normalizedColor)) return false;
    }

    // Check size
    if (normalizedSize) {
      const vSize = getOptionValue(variant.options, 'size');
      if (vSize !== normalizedSize) return false;
    }

    // Check other attributes
    for (const [attrKey, attrValue] of otherAttributes.entries()) {
      if (attrKey === 'color' || attrKey === 'size') continue;

      const variantValue = getOptionValue(variant.options, attrKey);
      const normalizedAttrValue = attrValue.toLowerCase().trim();

      // Try matching by valueId first (if available)
      const option = variant.options?.find(
        (opt) => opt.key === attrKey || opt.attribute === attrKey
      );

      if (option) {
        // Check by valueId if both have it
        if (option.valueId && attrValue) {
          // If the selected value is an ID, match by ID
          if (option.valueId === attrValue) {
            continue;
          }
        }

        // Fallback to value matching
        if (variantValue !== normalizedAttrValue) {
          return false;
        }
      } else {
        return false;
      }
    }

    return true;
  };

  // 1. Try to find exact match with all attributes
  const exactMatch = product.variants.find(
    (v) => variantMatches(v) && v.imageUrl
  );
  if (exactMatch) {
    return exactMatch;
  }

  // 2. Try to find any match (even without image) with all attributes
  const anyMatch = product.variants.find((v) => variantMatches(v));
  if (anyMatch) {
    return anyMatch;
  }

  // 3. Fallback: find by color and size only
  if (normalizedColor || normalizedSize) {
    return findVariantByColorAndSize(
      product,
      normalizedColor || null,
      normalizedSize || null
    );
  }

  // 4. Ultimate fallback
  return product.variants.find((v) => v.stock > 0) || product.variants[0] || null;
}




