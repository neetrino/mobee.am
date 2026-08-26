import type { Product, ProductVariant, AttributeGroupValue } from '../types';
import { getCurrentSelections } from './variant-compatibility';
import { calculateStock } from './stock-calculator';

interface BuildGroupsFromVariantsProps {
  product: Product;
  selectedColor: string | null;
  selectedSize: string | null;
  selectedAttributeValues: Map<string, string>;
}

/**
 * Build attribute groups from variants (old format)
 */
export function buildGroupsFromVariants({
  product,
  selectedColor,
  selectedSize,
  selectedAttributeValues,
}: BuildGroupsFromVariantsProps): Map<string, AttributeGroupValue[]> {
  const groups = new Map<string, AttributeGroupValue[]>();

  if (!product?.variants) {
    return groups;
  }

  const colorMap = new Map<string, ProductVariant[]>();
  const sizeMap = new Map<string, ProductVariant[]>();
  const otherAttributesMap = new Map<string, Map<string, ProductVariant[]>>();

  // IMPORTANT: Show ALL attribute values, regardless of other selections
  // We don't filter variants here - we show all values that exist in any variant
  // Stock will be calculated separately based on current selections

  product.variants.forEach((variant) => {
    // For old format, show all variants (no filtering by compatibility)
    // This ensures all attribute values are shown
    // IMPORTANT: Process ALL options for each attribute, not just the first one
    // A variant can have multiple values for the same attribute (e.g., color: [red, blue])

    // Extract ALL color values (not just the first one)
    variant.options?.forEach((opt) => {
      const attrKey = opt.key || opt.attribute || '';
      const value = opt.value || '';

      if (!value) return;

      if (attrKey === 'color') {
        const normalizedColor = value.toLowerCase().trim();
        if (!colorMap.has(normalizedColor)) {
          colorMap.set(normalizedColor, []);
        }
        // Add variant to this color's variants list (avoid duplicates)
        if (!colorMap.get(normalizedColor)!.some((v) => v.id === variant.id)) {
          colorMap.get(normalizedColor)!.push(variant);
        }
      } else if (attrKey === 'size') {
        const normalizedSize = value.toLowerCase().trim();
        if (!sizeMap.has(normalizedSize)) {
          sizeMap.set(normalizedSize, []);
        }
        // Add variant to this size's variants list (avoid duplicates)
        if (!sizeMap.get(normalizedSize)!.some((v) => v.id === variant.id)) {
          sizeMap.get(normalizedSize)!.push(variant);
        }
      } else if (attrKey) {
        // Extract other attributes
        if (!otherAttributesMap.has(attrKey)) {
          otherAttributesMap.set(attrKey, new Map());
        }
        const valueMap = otherAttributesMap.get(attrKey)!;
        const normalizedValue = value.toLowerCase().trim();
        if (!valueMap.has(normalizedValue)) {
          valueMap.set(normalizedValue, []);
        }
        // Add variant to this value's variants list (avoid duplicates)
        if (!valueMap.get(normalizedValue)!.some((v) => v.id === variant.id)) {
          valueMap.get(normalizedValue)!.push(variant);
        }
      }
    });
  });

  // Get current selections for stock calculation
  const colorSelections = getCurrentSelections('color', selectedColor, selectedSize, selectedAttributeValues);
  const sizeSelections = getCurrentSelections('size', selectedColor, selectedSize, selectedAttributeValues);

  if (colorMap.size > 0) {
    groups.set(
      'color',
      Array.from(colorMap.entries()).map(([value, variants]) => {
        const stock = calculateStock(variants, colorSelections, 'color');
        return {
          value,
          label: value,
          stock: stock,
          variants,
        };
      })
    );
  }

  if (sizeMap.size > 0) {
    groups.set(
      'size',
      Array.from(sizeMap.entries()).map(([value, variants]) => {
        const stock = calculateStock(variants, sizeSelections, 'size');
        return {
          value,
          label: value,
          stock: stock,
          variants,
        };
      })
    );
  }

  // Add other attributes
  otherAttributesMap.forEach((valueMap, attrKey) => {
    const attrSelections = getCurrentSelections(attrKey, selectedColor, selectedSize, selectedAttributeValues);

    groups.set(
      attrKey,
      Array.from(valueMap.entries()).map(([value, variants]) => {
        const stock = calculateStock(variants, attrSelections, attrKey);
        return {
          value,
          label: value,
          stock: stock,
          variants,
          imageUrl: null,
          colors: null,
        };
      })
    );
  });

  return groups;
}




