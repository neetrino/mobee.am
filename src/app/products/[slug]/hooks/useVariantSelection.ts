import { useState, useEffect, useCallback } from 'react';
import { getOptionValue } from '../utils/variant-helpers';
import { handleColorSelect as handleColorSelectUtil } from '../utils/image-switching';
import type { Product, ProductVariant, VariantOption } from '../types';

interface UseVariantSelectionProps {
  product: Product | null;
  setCurrentImageIndex: (index: number) => void;
}

function buildAttributeValuesFromVariant(
  variant: ProductVariant,
  getOptionValueFn: (options: VariantOption[] | undefined, key: string) => string | null,
): {
  color: string | null;
  size: string | null;
  attributes: Map<string, string>;
} {
  const color = getOptionValueFn(variant.options, 'color');
  const size = getOptionValueFn(variant.options, 'size');
  const attributes = new Map<string, string>();

  variant.options?.forEach((option) => {
    const key = option.key || option.attribute;
    if (!key || key === 'color' || key === 'size') return;

    if (option.valueId) {
      attributes.set(key, option.valueId);
      return;
    }

    if (option.value) {
      attributes.set(key, option.value);
    }
  });

  return { color, size, attributes };
}

export function useVariantSelection({
  product,
  setCurrentImageIndex,
}: UseVariantSelectionProps) {
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedAttributeValues, setSelectedAttributeValues] = useState<Map<string, string>>(new Map());

  const getOptionValueFn = useCallback((options: VariantOption[] | undefined, key: string): string | null => {
    return getOptionValue(options, key);
  }, []);

  useEffect(() => {
    setSelectedColor(null);
    setSelectedSize(null);
    setSelectedAttributeValues(new Map());
  }, [product?.id]);

  const applyVariantSelection = useCallback((variant: ProductVariant) => {
    const { color, size, attributes } = buildAttributeValuesFromVariant(variant, getOptionValueFn);
    setSelectedColor(color);
    setSelectedSize(size);
    setSelectedAttributeValues(attributes);
  }, [getOptionValueFn]);

  const handleColorSelect = useCallback((color: string) => {
    handleColorSelectUtil(
      color,
      product,
      [],
      selectedColor,
      setSelectedColor,
      setCurrentImageIndex
    );
  }, [product, selectedColor, setCurrentImageIndex]);

  const handleSizeSelect = useCallback((size: string) => {
    if (selectedSize === size) {
      setSelectedSize(null);
    } else {
      setSelectedSize(size);
    }
  }, [selectedSize]);

  const handleAttributeValueSelect = useCallback((attrKey: string, value: string) => {
    setSelectedAttributeValues((currentValues) => {
      const nextValues = new Map(currentValues);
      const currentValue = currentValues.get(attrKey);

      if (currentValue === value) {
        nextValues.delete(attrKey);
      } else {
        nextValues.set(attrKey, value);
      }

      return nextValues;
    });
  }, []);

  return {
    selectedColor,
    selectedSize,
    selectedAttributeValues,
    getOptionValue: getOptionValueFn,
    handleColorSelect,
    handleSizeSelect,
    handleAttributeValueSelect,
    applyVariantSelection,
  };
}
