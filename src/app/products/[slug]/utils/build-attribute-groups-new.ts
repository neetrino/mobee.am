import type { Product, ProductVariant, AttributeGroupValue } from '../types';
import { getCurrentSelections } from './variant-compatibility';
import { calculateStock } from './stock-calculator';
import { findAttributeValue } from './attribute-value-finder';

interface BuildGroupsFromProductAttributesProps {
  product: Product;
  selectedColor: string | null;
  selectedSize: string | null;
  selectedAttributeValues: Map<string, string>;
}

/**
 * Build attribute groups from productAttributes (new format)
 */
export function buildGroupsFromProductAttributes({
  product,
  selectedColor,
  selectedSize,
  selectedAttributeValues,
}: BuildGroupsFromProductAttributesProps): Map<string, AttributeGroupValue[]> {
  const groups = new Map<string, AttributeGroupValue[]>();

  if (!product.productAttributes || product.productAttributes.length === 0) {
    return groups;
  }

  product.productAttributes.forEach((productAttr) => {
    const attrKey = productAttr.attribute.key;
    const valueMap = new Map<
      string,
      { valueId?: string; value: string; label: string; variants: ProductVariant[] }
    >();

    // IMPORTANT: Show ALL attribute values, regardless of other selections
    // We don't filter variants here - we show all values that exist in any variant
    // Stock will be calculated separately based on current selections

    product.variants?.forEach((variant) => {
      // Include ALL variants - don't filter by compatibility
      // This ensures all attribute values are shown
      // IMPORTANT: Use filter() instead of find() to get ALL options for this attribute
      // A variant can have multiple values for the same attribute (e.g., color: [red, blue])

      const options =
        variant.options?.filter((opt) => {
          if (opt.valueId && opt.attributeId === productAttr.attribute.id) {
            return true;
          }
          return opt.key === attrKey || opt.attribute === attrKey;
        }) || [];

      // Process ALL options for this attribute (not just the first one)
      options.forEach((option) => {
        const valueId = option.valueId || '';
        const value = option.value || '';
        // Get label from AttributeValue if available, otherwise use value
        let label = option.value || '';
        if (valueId && productAttr.attribute.values) {
          const attrValue = (productAttr.attribute.values as Array<{ id?: string; label?: string; value?: string }>).find(
            (v) => v.id === valueId
          );
          if (attrValue) {
            label = attrValue.label || attrValue.value || value;
          }
        }

        const mapKey = valueId || value;
        if (!valueMap.has(mapKey)) {
          valueMap.set(mapKey, {
            valueId: valueId || undefined,
            value,
            label,
            variants: [],
          });
        }
        // Add variant to this value's variants list (avoid duplicates)
        if (!valueMap.get(mapKey)!.variants.some((v) => v.id === variant.id)) {
          valueMap.get(mapKey)!.variants.push(variant);
        }
      });
    });

    // Get current selections for stock calculation (excluding this attribute)
    const currentSelections = getCurrentSelections(
      attrKey,
      selectedColor,
      selectedSize,
      selectedAttributeValues
    );

    const groupsArray = Array.from(valueMap.values()).map((item) => {
      // Find the attribute value to get imageUrl and colors
      const attrValue = findAttributeValue(
        productAttr.attribute.values,
        item.valueId,
        item.value,
        item.label
      );

      // Calculate stock
      const stock = calculateStock(item.variants, currentSelections, attrKey);

      return {
        valueId: item.valueId,
        value: item.value,
        label: item.label,
        stock: stock,
        variants: item.variants,
        imageUrl: attrValue?.imageUrl || null,
        colors: attrValue?.colors || null,
      };
    });

    groups.set(attrKey, groupsArray);
  });

  // Also extract any additional attributes from variant options that might not be in productAttributes
  // This handles cases where attributes were added to variants but not yet synced to productAttributes
  if (product?.variants) {
    const allAttributeKeys = new Set<string>();

    // Collect all attribute keys from variant options
    product.variants.forEach((variant) => {
      variant.options?.forEach((opt) => {
        const attrKey = opt.key || opt.attribute || '';
        if (attrKey && attrKey !== 'color' && attrKey !== 'size') {
          allAttributeKeys.add(attrKey);
        }
      });
    });

    // For each attribute key not already in groups, create attribute group from variants
    allAttributeKeys.forEach((attrKey) => {
      if (!groups.has(attrKey)) {
        const valueMap = new Map<
          string,
          { valueId?: string; value: string; label: string; variants: ProductVariant[] }
        >();

        product.variants?.forEach((variant) => {
          const options =
            variant.options?.filter((opt) => opt.key === attrKey || opt.attribute === attrKey) ||
            [];

          // Process ALL options for this attribute (not just the first one)
          options.forEach((option) => {
            const valueId = option.valueId || '';
            const value = option.value || '';
            const label = option.value || '';

            const mapKey = valueId || value;
            if (!valueMap.has(mapKey)) {
              valueMap.set(mapKey, {
                valueId: valueId || undefined,
                value,
                label,
                variants: [],
              });
            }
            // Add variant to this value's variants list (avoid duplicates)
            if (!valueMap.get(mapKey)!.variants.some((v) => v.id === variant.id)) {
              valueMap.get(mapKey)!.variants.push(variant);
            }
          });
        });

        if (valueMap.size > 0) {
          // Try to find attribute values from productAttributes to get imageUrl
          const productAttr = product.productAttributes?.find(
            (pa: { attribute?: { key?: string } }) => pa.attribute?.key === attrKey
          );

          // Get current selections for stock calculation (excluding this attribute)
          const currentSelections = getCurrentSelections(
            attrKey,
            selectedColor,
            selectedSize,
            selectedAttributeValues
          );

          const groupsArray = Array.from(valueMap.values()).map((item) => {
            // Try to find attribute value to get imageUrl and colors
            const attrValue = productAttr?.attribute?.values
              ? findAttributeValue(
                  productAttr.attribute.values,
                  item.valueId,
                  item.value,
                  item.label
                )
              : null;

            // Calculate stock
            const stock = calculateStock(item.variants, currentSelections, attrKey);

            return {
              valueId: item.valueId,
              value: item.value,
              label: item.label,
              stock: stock,
              variants: item.variants,
              imageUrl: attrValue?.imageUrl || null,
              colors: attrValue?.colors || null,
            };
          });

          groups.set(attrKey, groupsArray);
        }
      }
    });
  }

  return groups;
}




