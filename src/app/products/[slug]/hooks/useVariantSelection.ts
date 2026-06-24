import { useState, useEffect, useCallback, useRef } from 'react';
import { getOptionValue } from '../utils/variant-helpers';
import { handleColorSelect as handleColorSelectUtil } from '../utils/image-switching';
import type { Product, ProductVariant, VariantOption } from '../types';

interface UseVariantSelectionProps {
  product: Product | null;
  setCurrentImageIndex: (index: number) => void;
}

function buildAttributeValuesFromVariant(variant: ProductVariant): {
  color: string | null;
  size: string | null;
  attributes: Map<string, string>;
} {
  const color = getOptionValue(variant.options, 'color');
  const size = getOptionValue(variant.options, 'size');
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

function getDefaultVariant(product: Product): ProductVariant | null {
  if (!product.variants?.length) return null;
  return product.variants.find((variant) => variant.stock > 0) ?? product.variants[0] ?? null;
}

export function useVariantSelection({
  product,
  setCurrentImageIndex,
}: UseVariantSelectionProps) {
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedAttributeValues, setSelectedAttributeValues] = useState<Map<string, string>>(new Map());
  const initializedProductIdRef = useRef<string | null>(null);

  const productId = product?.id ?? null;
  const variantCount = product?.variants?.length ?? 0;

  const applyVariantSelection = useCallback((variant: ProductVariant) => {
    const { color, size, attributes } = buildAttributeValuesFromVariant(variant);
    setSelectedColor(color);
    setSelectedSize(size);
    setSelectedAttributeValues(attributes);
  }, []);

  useEffect(() => {
    if (!productId || variantCount === 0) {
      initializedProductIdRef.current = null;
      setSelectedColor(null);
      setSelectedSize(null);
      setSelectedAttributeValues(new Map());
      return;
    }

    if (!product) {
      return;
    }

    if (initializedProductIdRef.current === productId) {
      return;
    }

    initializedProductIdRef.current = productId;
    const initialVariant = getDefaultVariant(product);
    if (initialVariant) {
      applyVariantSelection(initialVariant);
    }
  }, [productId, variantCount, applyVariantSelection]);

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
    setSelectedSize(size.toLowerCase().trim());
  }, []);

  const handleAttributeValueSelect = useCallback((attrKey: string, value: string) => {
    setSelectedAttributeValues((currentValues) => {
      const nextValues = new Map(currentValues);
      nextValues.set(attrKey, value);
      return nextValues;
    });
  }, []);

  const getOptionValueFn = useCallback(
    (options: VariantOption[] | undefined, key: string): string | null => getOptionValue(options, key),
    [],
  );

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
