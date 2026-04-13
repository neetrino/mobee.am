'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { getStoredCurrency } from '../../../lib/currency';
import { getStoredLanguage, type LanguageCode } from '../../../lib/language';
import { t } from '../../../lib/i18n';
import { useAttributeGroups } from './useAttributeGroups';
import { useProductImages } from './hooks/useProductImages';
import { useProductFetch } from './hooks/useProductFetch';
import { useWishlistCompare } from './hooks/useWishlistCompare';
import { useProductReviews } from './hooks/useProductReviews';
import { useVariantSelection } from './hooks/useVariantSelection';
import { useProductActions } from './hooks/useProductActions';
import { useProductQuantity } from './hooks/useProductQuantity';
import { useProductCalculations } from './hooks/useProductCalculations';
import type { Product } from './types';

export function useProductPage(params: Promise<{ slug?: string }>) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currency, setCurrency] = useState(getStoredCurrency());
  const [language, setLanguage] = useState<LanguageCode>('en');
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [showMessage, setShowMessage] = useState<string | null>(null);
  const [thumbnailStartIndex, setThumbnailStartIndex] = useState(0);

  const resolvedParams = use(params);
  const rawSlug = resolvedParams?.slug ?? '';
  const slugParts = rawSlug.includes(':') ? rawSlug.split(':') : [rawSlug];
  const slug = slugParts[0];
  const variantIdFromUrl = slugParts.length > 1 ? slugParts[1] : null;

  const {
    product,
    loading,
  } = useProductFetch({
    slug,
    variantIdFromUrl,
  });

  const images = useProductImages(product);

  const {
    selectedVariant,
    setSelectedVariant,
    selectedColor,
    selectedSize,
    selectedAttributeValues,
    currentVariant,
    getOptionValue,
    handleColorSelect,
    handleSizeSelect,
    handleAttributeValueSelect,
  } = useVariantSelection({
    product,
    images,
    setCurrentImageIndex,
  });

  const attributeGroups = useAttributeGroups({
    product,
    selectedColor,
    selectedSize,
    selectedAttributeValues,
  });

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
  });

  const { quantity, setQuantity, maxQuantity, adjustQuantity } = useProductQuantity({
    currentVariant,
    isOutOfStock,
    isVariationRequired,
  });

  const { isInWishlist, setIsInWishlist, isInCompare, setIsInCompare } = useWishlistCompare({
    productId: product?.id || null,
  });

  const { reviews, averageRating } = useProductReviews({
    slug,
    productId: product?.id || null,
  });

  const { handleAddToWishlist, handleCompareToggle } = useProductActions({
    productId: product?.id || null,
    isInWishlist,
    setIsInWishlist,
    isInCompare,
    setIsInCompare,
    setShowMessage,
    language,
  });

  useEffect(() => {
    setLanguage(getStoredLanguage());
  }, []);

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
    if (product && product.variants && product.variants.length > 0 && variantIdFromUrl) {
      const variantById = product.variants.find(v => v.id === variantIdFromUrl || v.id.endsWith(variantIdFromUrl));
      const variantByIndex = product.variants[parseInt(variantIdFromUrl) - 1];
      const initialVariant = variantById || variantByIndex || product.variants[0];
      setSelectedVariant(initialVariant);
      setCurrentImageIndex(0);
      setThumbnailStartIndex(0);
    }
  }, [product, variantIdFromUrl, setSelectedVariant]);

  const scrollToReviews = useCallback(() => {
    const reviewsElement = document.getElementById('product-reviews');
    if (reviewsElement) {
      reviewsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const getRequiredAttributesMessage = (): string => {
    const needsColor = colorGroups.length > 0 && colorGroups.some(g => g.stock > 0) && !selectedColor;
    const needsSize = sizeGroups.length > 0 && sizeGroups.some(g => g.stock > 0) && !selectedSize;
    
    if (needsColor && needsSize) return t(language, 'product.selectColorAndSize');
    if (needsColor) return t(language, 'product.selectColor');
    if (needsSize) return t(language, 'product.selectSize');
    return t(language, 'product.selectOptions');
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
    selectedVariant,
    selectedColor,
    selectedSize,
    selectedAttributeValues,
    isAddingToCart,
    setIsAddingToCart,
    showMessage,
    setShowMessage,
    isInWishlist,
    isInCompare,
    quantity,
    reviews,
    averageRating,
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
    scrollToReviews,
    getOptionValue,
    adjustQuantity,
    handleColorSelect,
    handleSizeSelect,
    handleAttributeValueSelect,
    handleAddToWishlist,
    handleCompareToggle,
    getRequiredAttributesMessage,
  };
}
