import type { VariantOption, ProductVariant } from '../types';

/**
 * Helper function to get option value (supports both new and old format)
 * @param options - Variant options array
 * @param key - Option key to find
 * @returns Option value or null
 */
export function getOptionValue(
  options: VariantOption[] | undefined,
  key: string
): string | null {
  if (!options) return null;
  const opt = options.find((o) => o.key === key || o.attribute === key);
  return opt?.value?.toLowerCase().trim() || null;
}

/**
 * Helper function to check if variant has a specific color value (checks ALL color options)
 * A variant can have multiple color values (e.g., color: ["red", "blue"])
 * @param variant - Product variant to check
 * @param color - Color value to check for
 * @returns True if variant has the color
 */
export function variantHasColor(
  variant: ProductVariant,
  color: string
): boolean {
  if (!variant.options || !color) return false;
  const normalizedColor = color.toLowerCase().trim();

  // Check ALL options for color attribute
  const colorOptions = variant.options.filter(
    (opt) => opt.key === 'color' || opt.attribute === 'color'
  );

  // Check if any color option matches
  return colorOptions.some((opt) => {
    const optValue = opt.value?.toLowerCase().trim();
    return optValue === normalizedColor;
  });
}




