import { useState, useEffect, useCallback, useRef } from 'react';
import { getOptionValue } from '../utils/variant-helpers';
import { findVariantByColorAndSize } from '../utils/variant-finders';
import { handleColorSelect as handleColorSelectUtil } from '../utils/image-switching';
import type { Product, ProductVariant, VariantOption } from '../types';

interface UseVariantSelectionProps {
  product: Product | null;
  setCurrentImageIndex: (index: number) => void;
  colorFromUrl?: string | null;
  variantIdFromUrl?: string | null;
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
      attributes.set(key, option.value.toLowerCase().trim());
    }
  });

  return { color, size, attributes };
}

function getDefaultVariant(product: Product): ProductVariant | null {
  if (!product.variants?.length) return null;
  return product.variants.find((variant) => variant.stock > 0) ?? product.variants[0] ?? null;
}

function resolveInitialVariant(
  product: Product,
  colorFromUrl?: string | null,
  variantIdFromUrl?: string | null,
): ProductVariant | null {
  if (variantIdFromUrl) {
    const variantById = product.variants.find(
      (variant) =>
        variant.id === variantIdFromUrl || variant.id.endsWith(variantIdFromUrl),
    );
    const variantByIndex = product.variants[parseInt(variantIdFromUrl, 10) - 1];
    const fromUrl = variantById || variantByIndex;
    if (fromUrl) return fromUrl;
  }

  if (colorFromUrl) {
    const fromColor = findVariantByColorAndSize(product, colorFromUrl, null);
    if (fromColor) return fromColor;
  }

  return getDefaultVariant(product);
}

export function useVariantSelection({
  product,
  setCurrentImageIndex,
  colorFromUrl = null,
  variantIdFromUrl = null,
}: UseVariantSelectionProps) {
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedAttributeValues, setSelectedAttributeValues] = useState<Map<string, string>>(new Map());
  const initializedKeyRef = useRef<string | null>(null);

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
      if (!productId) {
        initializedKeyRef.current = null;
      }
      setSelectedColor(null);
      setSelectedSize(null);
      setSelectedAttributeValues(new Map());
      return;
    }

    if (!product) {
      return;
    }

    const initKey = `${productId}:${colorFromUrl ?? ''}:${variantIdFromUrl ?? ''}`;
    if (initializedKeyRef.current === initKey) {
      return;
    }

    initializedKeyRef.current = initKey;

    const initialVariant = resolveInitialVariant(product, colorFromUrl, variantIdFromUrl);

    if (initialVariant) {
      applyVariantSelection(initialVariant);
    }
  }, [
    productId,
    variantCount,
    product,
    applyVariantSelection,
    colorFromUrl,
    variantIdFromUrl,
  ]);

  const applyColorSelection = useCallback((color: string) => {
    if (!color) return;
    setSelectedColor(color.toLowerCase().trim());
  }, []);

  const handleColorSelect = useCallback((color: string) => {
    handleColorSelectUtil(
      color,
      product,
      [],
      null,
      setSelectedColor,
      setCurrentImageIndex,
    );
  }, [product, setCurrentImageIndex]);

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
    applyColorSelection,
  };
}
