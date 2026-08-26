import type { Product, ProductVariant, VariantOption } from '../types';

type ColorAttributeValue = {
  id: string;
  value: string;
  label: string;
};

function getColorAttributeValues(product: Product | null | undefined): ColorAttributeValue[] {
  const colorAttr = product?.productAttributes?.find(
    (entry) => entry.attribute?.key === 'color' || entry.attribute?.key === 'colour',
  );
  if (!colorAttr?.attribute?.values?.length) {
    return [];
  }

  return colorAttr.attribute.values;
}

function colorOptionMatchesToken(
  option: VariantOption,
  normalizedColor: string,
  colorAttributeValues: ColorAttributeValue[],
): boolean {
  const optValue = option.value?.toLowerCase().trim();
  const optValueId = option.valueId?.toLowerCase().trim();
  if (optValue === normalizedColor || optValueId === normalizedColor) {
    return true;
  }

  if (!option.valueId || colorAttributeValues.length === 0) {
    return false;
  }

  const attributeValue = colorAttributeValues.find((entry) => entry.id === option.valueId);
  if (!attributeValue) {
    return false;
  }

  const canonical = attributeValue.value?.trim().toLowerCase();
  const label = attributeValue.label?.trim().toLowerCase();
  return canonical === normalizedColor || label === normalizedColor;
}

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
 * @param product - Optional product for canonical color token matching
 * @returns True if variant has the color
 */
export function variantHasColor(
  variant: ProductVariant,
  color: string,
  product?: Product | null,
): boolean {
  if (!variant.options || !color) return false;
  const normalizedColor = color.toLowerCase().trim();
  const colorAttributeValues = getColorAttributeValues(product);

  const colorOptions = variant.options.filter(
    (opt) => opt.key === 'color' || opt.attribute === 'color'
  );

  return colorOptions.some((opt) =>
    colorOptionMatchesToken(opt, normalizedColor, colorAttributeValues),
  );
}




