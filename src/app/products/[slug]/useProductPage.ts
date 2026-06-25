'use client';

import { useState, useEffect, useMemo } from 'react';
import { getStoredCurrency } from '../../../lib/currency';
import { type LanguageCode } from '../../../lib/language';
import { useUiLanguage } from '../../../components/UiLanguageProvider';
import { t } from '../../../lib/i18n';
import { useAttributeGroups } from './useAttributeGroups';
import { useProductImages } from './hooks/useProductImages';
import { useProductFetch } from './hooks/useProductFetch';
import { useWishlistCompare } from './hooks/useWishlistCompare';
import { useVariantSelection } from './hooks/useVariantSelection';
import { useProductActions } from './hooks/useProductActions';
import { useProductQuantity } from './hooks/useProductQuantity';
import { useProductCalculations } from './hooks/useProductCalculations';
import { getVariantMainImageIndex } from './utils/variant-media';
import { resolveCompareCategoryId } from '../../../lib/shop/compare-storage';
import { getMissingRequiredAttributeKeys } from './utils/required-attribute-selection';
import { findVariantByAllAttributesStrict } from './utils/variant-finders';
import type { Product } from './types';

export type UseProductPageProps = {
  slug: string;
  variantIdFromUrl: string | null;
  initialProduct?: Product | null;
  initialLocale?: LanguageCode;
  initialNotFound?: boolean;
};

export function useProductPage({
  slug,
  variantIdFromUrl,
  initialProduct = null,
  initialLocale,
  initialNotFound = false,
}: UseProductPageProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currency, setCurrency] = useState(getStoredCurrency());
  const language: LanguageCode = useUiLanguage();
  const [thumbnailStartIndex, setThumbnailStartIndex] = useState(0);

  const {
    product,
    shellProduct,
    loading,
    isNotFound,
  } = useProductFetch({
    slug,
    variantIdFromUrl,
    initialProduct,
    initialLocale,
    initialNotFound,
  });

  const {
    selectedColor,
    selectedSize,
    selectedAttributeValues,
    getOptionValue,
    handleColorSelect,
    handleSizeSelect,
    handleAttributeValueSelect,
    applyVariantSelection,
  } = useVariantSelection({
    product,
    setCurrentImageIndex,
  });

  const attributeGroups = useAttributeGroups({
    product,
    selectedColor,
    selectedSize,
    selectedAttributeValues,
  });

  const currentVariant = useMemo(() => {
    if (!product?.variants?.length) return null;

    const missingKeys = getMissingRequiredAttributeKeys(
      attributeGroups,
      selectedColor,
      selectedSize,
      selectedAttributeValues,
    );

    if (missingKeys.length > 0) return null;

    return findVariantByAllAttributesStrict(
      product,
      selectedColor,
      selectedSize,
      selectedAttributeValues,
    );
  }, [product, attributeGroups, selectedColor, selectedSize, selectedAttributeValues]);

  const images = useProductImages(product, currentVariant);

  const {
    price,
    originalPrice,
    compareAtPrice,
    discountPercent,
    isOutOfStock,
    colorGroups,
    sizeGroups,
    isVariationRequired,
    unavailableAttributes,
    hasUnavailableAttributes,
    canAddToCart,
  } = useProductCalculations({
    product,
    currentVariant,
    attributeGroups,
    selectedColor,
    selectedSize,
    selectedAttributeValues,
  });

  const { quantity, setQuantity: _setQuantity, maxQuantity, adjustQuantity } = useProductQuantity({
    currentVariant,
    isOutOfStock,
    isVariationRequired,
  });

  const { isInWishlist, setIsInWishlist, isInCompare, setIsInCompare } = useWishlistCompare({
    productId: product?.id || null,
  });

  const { handleAddToWishlist, handleCompareToggle } = useProductActions({
    productId: product?.id || null,
    compareCategoryId: product ? resolveCompareCategoryId(product) : '',
    isInWishlist,
    setIsInWishlist,
    setIsInCompare,
  });

  useEffect(() => {
    const handleCurrencyUpdate = () => setCurrency(getStoredCurrency());
    const handleCurrencyRatesUpdate = () => setCurrency(getStoredCurrency());

    window.addEventListener('currency-updated', handleCurrencyUpdate);
    window.addEventListener('currency-rates-updated', handleCurrencyRatesUpdate);

    return () => {
      window.removeEventListener('currency-updated', handleCurrencyUpdate);
      window.removeEventListener('currency-rates-updated', handleCurrencyRatesUpdate);
    };
  }, []);

  useEffect(() => {
    if (images.length > 0 && currentImageIndex >= images.length) {
      setCurrentImageIndex(0);
    }
  }, [images.length, currentImageIndex]);

  useEffect(() => {
    if (!currentVariant || images.length === 0) return;
    setCurrentImageIndex(getVariantMainImageIndex(currentVariant, images));
    setThumbnailStartIndex(0);
  }, [currentVariant?.id, images]);

  useEffect(() => {
    if (!product?.variants?.length || !variantIdFromUrl) return;

    const variantById = product.variants.find(
      (variant) => variant.id === variantIdFromUrl || variant.id.endsWith(variantIdFromUrl),
    );
    const variantByIndex = product.variants[parseInt(variantIdFromUrl, 10) - 1];
    const initialVariant = variantById || variantByIndex;

    if (initialVariant) {
      applyVariantSelection(initialVariant);
      setCurrentImageIndex(0);
      setThumbnailStartIndex(0);
    }
  }, [product, variantIdFromUrl, applyVariantSelection]);

  const resolveAttributeLabel = (attrKey: string): string => {
    const productAttr = product?.productAttributes?.find((pa) => pa.attribute?.key === attrKey);
    if (productAttr?.attribute?.name) return productAttr.attribute.name;
    if (attrKey === 'color' || attrKey === 'colour') return t(language, 'product.color');
    if (attrKey === 'size') return t(language, 'product.size');
    return attrKey.charAt(0).toUpperCase() + attrKey.slice(1);
  };

  const getRequiredAttributesMessage = (): string => {
    const missingKeys = getMissingRequiredAttributeKeys(
      attributeGroups,
      selectedColor,
      selectedSize,
      selectedAttributeValues,
    );

    if (missingKeys.length === 0) {
      return t(language, 'product.selectOptions');
    }

    const needsColor = missingKeys.some((key) => key === 'color' || key === 'colour');
    const needsSize = missingKeys.includes('size');
    const otherMissing = missingKeys.filter(
      (key) => key !== 'color' && key !== 'colour' && key !== 'size',
    );

    if (needsColor && needsSize && otherMissing.length === 0) {
      return t(language, 'product.selectColorAndSize');
    }
    if (needsColor && missingKeys.length === 1) {
      return t(language, 'product.selectColor');
    }
    if (needsSize && missingKeys.length === 1) {
      return t(language, 'product.selectSize');
    }

    const labels = missingKeys.map((key) => resolveAttributeLabel(key));
    return `${t(language, 'product.selectOptions')}: ${labels.join(', ')}`;
  };

  return {
    product,
    loading,
    images,
    currentImageIndex,
    setCurrentImageIndex,
    thumbnailStartIndex,
    setThumbnailStartIndex,
    currency,
    language,
    selectedColor,
    selectedSize,
    selectedAttributeValues,
    isInWishlist,
    isInCompare,
    quantity,
    slug,
    attributeGroups,
    colorGroups,
    sizeGroups,
    currentVariant,
    price,
    originalPrice,
    compareAtPrice,
    discountPercent,
    maxQuantity,
    isOutOfStock,
    isVariationRequired,
    hasUnavailableAttributes,
    unavailableAttributes,
    canAddToCart,
    getOptionValue,
    adjustQuantity,
    handleColorSelect,
    handleSizeSelect,
    handleAttributeValueSelect,
    handleAddToWishlist,
    handleCompareToggle,
    getRequiredAttributesMessage,
    shellProduct,
    isNotFound,
  };
}
