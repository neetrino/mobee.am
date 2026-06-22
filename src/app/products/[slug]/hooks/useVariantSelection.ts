import { useState, useEffect, useCallback, useMemo } from 'react';
import { getOptionValue } from '../utils/variant-helpers';
import { findVariantByColorAndSize, findVariantByAllAttributes } from '../utils/variant-finders';
import { switchToVariantImage, handleColorSelect as handleColorSelectUtil } from '../utils/image-switching';
import { getVariantMedia } from '../utils/variant-media';
import type { Product, ProductVariant, VariantOption } from '../types';

interface UseVariantSelectionProps {
  product: Product | null;
  setCurrentImageIndex: (index: number) => void;
  setThumbnailStartIndex: (index: number) => void;
}

export function useVariantSelection({
  product,
  setCurrentImageIndex,
  setThumbnailStartIndex,
}: UseVariantSelectionProps) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedAttributeValues, setSelectedAttributeValues] = useState<Map<string, string>>(new Map());

  const getOptionValueFn = useCallback((options: VariantOption[] | undefined, key: string): string | null => {
    return getOptionValue(options, key);
  }, []);

  const findVariantByColorAndSizeFn = useCallback((color: string | null, size: string | null): ProductVariant | null => {
    return findVariantByColorAndSize(product, color, size);
  }, [product]);

  const findVariantByAllAttributesFn = useCallback((
    color: string | null,
    size: string | null,
    otherAttributes: Map<string, string>
  ): ProductVariant | null => {
    return findVariantByAllAttributes(product, color, size, otherAttributes);
  }, [product]);

  const applyVariantGallery = useCallback((variant: ProductVariant | null) => {
    const gallery = getVariantMedia(product, variant);
    switchToVariantImage(variant, product, gallery, setCurrentImageIndex);
    setThumbnailStartIndex(0);
  }, [product, setCurrentImageIndex, setThumbnailStartIndex]);

  // Initialize variant when product changes
  useEffect(() => {
    if (product && product.variants && product.variants.length > 0 && !selectedVariant) {
      const initialVariant = product.variants[0];
      setSelectedVariant(initialVariant);
      const colorValue = getOptionValueFn(initialVariant.options, 'color');
      const sizeValue = getOptionValueFn(initialVariant.options, 'size');
      if (colorValue) setSelectedColor(colorValue);
      if (sizeValue) setSelectedSize(sizeValue);
      applyVariantGallery(initialVariant);
    }
  }, [product, selectedVariant, getOptionValueFn, applyVariantGallery]);

  // Update variant when selections change
  useEffect(() => {
    if (product && product.variants && product.variants.length > 0) {
      const newVariant = findVariantByAllAttributesFn(selectedColor, selectedSize, selectedAttributeValues);
      if (newVariant && newVariant.id !== selectedVariant?.id) {
        setSelectedVariant(newVariant);
        applyVariantGallery(newVariant);
        const colorValue = getOptionValueFn(newVariant.options, 'color');
        const sizeValue = getOptionValueFn(newVariant.options, 'size');
        if (colorValue && colorValue !== selectedColor?.toLowerCase().trim()) {
          setSelectedColor(colorValue);
        }
        if (sizeValue && sizeValue !== selectedSize?.toLowerCase().trim()) {
          setSelectedSize(sizeValue);
        }
      }
    }
  }, [
    selectedColor,
    selectedSize,
    selectedAttributeValues,
    findVariantByAllAttributesFn,
    selectedVariant?.id,
    product,
    getOptionValueFn,
    applyVariantGallery,
  ]);

  const handleColorSelect = useCallback((color: string) => {
    handleColorSelectUtil(
      color,
      product,
      [],
      selectedColor,
      setSelectedColor,
      setCurrentImageIndex
    );
  }, [product, selectedColor, setSelectedColor, setCurrentImageIndex]);

  const handleSizeSelect = useCallback((size: string) => {
    if (selectedSize === size) {
      setSelectedSize(null);
    } else {
      setSelectedSize(size);
    }
  }, [selectedSize, setSelectedSize]);

  const handleAttributeValueSelect = useCallback((attrKey: string, value: string) => {
    const newMap = new Map(selectedAttributeValues);
    const currentValue = selectedAttributeValues.get(attrKey);
    if (currentValue === value) {
      newMap.delete(attrKey);
    } else {
      newMap.set(attrKey, value);
    }
    setSelectedAttributeValues(newMap);
  }, [selectedAttributeValues]);

  const currentVariant = useMemo(() => {
    return selectedVariant || findVariantByColorAndSizeFn(selectedColor, selectedSize) || product?.variants?.[0] || null;
  }, [selectedVariant, findVariantByColorAndSizeFn, selectedColor, selectedSize, product?.variants]);

  return {
    selectedVariant,
    setSelectedVariant,
    selectedColor,
    selectedSize,
    selectedAttributeValues,
    currentVariant,
    getOptionValue: getOptionValueFn,
    handleColorSelect,
    handleSizeSelect,
    handleAttributeValueSelect,
  };
}
