import type { ProductVariant, VariantOption } from '../types';

/**
 * Check if a variant is compatible with currently selected attributes
 * This is used to filter which attribute values to show based on current selections
 * IMPORTANT: A variant can have multiple values for the same attribute (e.g., color: [red, blue, yellow])
 * So we need to check ALL options, not just the first one
 */
export function isVariantCompatible(
  variant: ProductVariant,
  currentSelections: Map<string, string>,
  excludeAttrKey?: string
): boolean {
  // If no selections, all variants are compatible
  if (currentSelections.size === 0) return true;

  // Check each selected attribute (excluding the one we're building)
  for (const [attrKey, selectedValue] of currentSelections.entries()) {
    // Skip the attribute we're currently building
    if (excludeAttrKey && attrKey === excludeAttrKey) {
      continue;
    }

    // IMPORTANT: Check ALL options for this attribute, not just the first one
    // A variant can have multiple values for the same attribute
    const normalizedSelectedValue = selectedValue.toLowerCase().trim();
    let hasMatchingValue = false;

    // Check all options for this attribute
    const matchingOptions =
      variant.options?.filter((opt) => {
        const optKey = opt.key || opt.attribute;
        return optKey === attrKey;
      }) || [];

    if (matchingOptions.length === 0) {
      // Variant doesn't have this attribute, so it's not compatible
      return false;
    }

    // Check if any of the options match the selected value
    for (const option of matchingOptions) {
      const optValue = option.value?.toLowerCase().trim();
      const optValueId = option.valueId;

      // Match by value (case-insensitive)
      if (optValue === normalizedSelectedValue) {
        hasMatchingValue = true;
        break;
      }

      // Match by valueId
      if (optValueId && optValueId === selectedValue) {
        hasMatchingValue = true;
        break;
      }
    }

    // If no matching value found, variant is not compatible
    if (!hasMatchingValue) {
      return false;
    }
  }
  return true; // All selected attributes match
}

/**
 * Get currently selected attributes (excluding the attribute we're building)
 */
export function getCurrentSelections(
  excludeAttrKey: string,
  selectedColor: string | null,
  selectedSize: string | null,
  selectedAttributeValues: Map<string, string>
): Map<string, string> {
  const selections = new Map<string, string>();
  if (selectedColor && excludeAttrKey !== 'color') {
    selections.set('color', selectedColor);
  }
  if (selectedSize && excludeAttrKey !== 'size') {
    selections.set('size', selectedSize);
  }
  selectedAttributeValues.forEach((value, key) => {
    if (key !== excludeAttrKey) {
      selections.set(key, value);
    }
  });
  return selections;
}




