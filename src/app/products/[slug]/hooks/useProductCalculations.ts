import { useMemo } from 'react';
import type { Product, ProductVariant, AttributeGroupValue } from '../types';
import { getMissingRequiredAttributeKeys } from '../utils/required-attribute-selection';

interface UseProductCalculationsProps {
  product: Product | null;
  currentVariant: ProductVariant | null;
  attributeGroups: Map<string, AttributeGroupValue[]>;
  selectedColor: string | null;
  selectedSize: string | null;
  selectedAttributeValues: Map<string, string>;
}

export function useProductCalculations({
  product,
  currentVariant,
  attributeGroups,
  selectedColor,
  selectedSize,
  selectedAttributeValues,
}: UseProductCalculationsProps) {
  const missingRequiredAttributeKeys = useMemo(
    () =>
      getMissingRequiredAttributeKeys(
        attributeGroups,
        selectedColor,
        selectedSize,
        selectedAttributeValues,
      ),
    [attributeGroups, selectedColor, selectedSize, selectedAttributeValues],
  );

  const isVariationRequired = missingRequiredAttributeKeys.length > 0;
  const price = currentVariant?.price || 0;
  const originalPrice = currentVariant?.originalPrice;
  const compareAtPrice = currentVariant?.compareAtPrice;
  const discountPercent = currentVariant?.productDiscount || product?.productDiscount || null;
  const isOutOfStock =
    !isVariationRequired && (!currentVariant || currentVariant.stock <= 0);

  const isSingleVariantOutOfStock = useMemo(() => {
    const variantCount = product?.variants?.length ?? 0;
    return (
      variantCount === 1 &&
      Boolean(currentVariant) &&
      (currentVariant?.stock ?? 0) <= 0
    );
  }, [product?.variants?.length, currentVariant]);

  const colorGroups = useMemo(() => {
    const groups: Array<{ color: string; stock: number; variants: ProductVariant[] }> = [];
    const colorAttrGroup = attributeGroups.get('color');
    if (colorAttrGroup) {
      groups.push(...colorAttrGroup.map((g) => ({
        color: g.value,
        stock: g.stock,
        variants: g.variants,
      })));
    }
    return groups;
  }, [attributeGroups]);

  const sizeGroups = useMemo(() => {
    const groups: Array<{ size: string; stock: number; variants: ProductVariant[] }> = [];
    const sizeAttrGroup = attributeGroups.get('size');
    if (sizeAttrGroup) {
      groups.push(...sizeAttrGroup.map((g) => ({
        size: g.value,
        stock: g.stock,
        variants: g.variants,
      })));
    }
    return groups;
  }, [attributeGroups]);

  const unavailableAttributes = useMemo(() => {
    const unavailable = new Map<string, boolean>();
    if (!currentVariant || !product || isSingleVariantOutOfStock) return unavailable;
    
    currentVariant.options?.forEach((option) => {
      const attrKey = option.key || option.attribute;
      if (!attrKey) return;
      
      const attrGroup = attributeGroups.get(attrKey);
      if (!attrGroup) return;
      
      const attrValue = attrGroup.find((g) => {
        if (option.valueId && g.valueId) return g.valueId === option.valueId;
        return g.value?.toLowerCase().trim() === option.value?.toLowerCase().trim();
      });
      
      if (attrValue && attrValue.stock <= 0) {
        unavailable.set(attrKey, true);
      }
    });
    
    return unavailable;
  }, [currentVariant, attributeGroups, product, isSingleVariantOutOfStock]);

  const hasUnavailableAttributes = unavailableAttributes.size > 0;
  const canAddToCart =
    !isVariationRequired &&
    Boolean(currentVariant) &&
    (currentVariant?.stock ?? 0) > 0 &&
    !hasUnavailableAttributes;

  return {
    price,
    originalPrice: originalPrice ?? null,
    compareAtPrice: compareAtPrice ?? null,
    discountPercent,
    isOutOfStock,
    isSingleVariantOutOfStock,
    colorGroups,
    sizeGroups,
    isVariationRequired,
    missingRequiredAttributeKeys,
    unavailableAttributes,
    hasUnavailableAttributes,
    canAddToCart,
  };
}




