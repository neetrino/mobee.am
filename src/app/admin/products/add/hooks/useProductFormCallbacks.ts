/**
 * Hook for product form callbacks and event handlers
 */

import type { ChangeEvent } from 'react';
import type { Attribute, Category, GeneratedVariant } from '../types';
import { syncSlugWithTitle } from '@/lib/utils/slug';
import { nextVariantSku } from '../utils/variantSku';

interface UseProductFormCallbacksProps {
  formData: {
    title: string;
    slug: string;
    primaryCategoryId: string;
  };
  categories: Category[];
  attributes: Attribute[];
  selectedAttributesForVariants: Set<string>;
  selectedAttributeValueIds: Record<string, string[]>;
  generatedVariants: GeneratedVariant[];
  setFormData: (updater: (prev: any) => any) => void;
  setSelectedAttributesForVariants: (value: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  setSelectedAttributeValueIds: (value: Record<string, string[]> | ((prev: Record<string, string[]>) => Record<string, string[]>)) => void;
  setGeneratedVariants: (value: GeneratedVariant[] | ((prev: GeneratedVariant[]) => GeneratedVariant[])) => void;
  setSimpleProductData: (value: any | ((prev: any) => any)) => void;
  checkIsClothingCategory: (categoryId: string, categories: Category[]) => boolean;
  isEditMode: boolean;
}

export function useProductFormCallbacks({
  formData,
  categories,
  attributes,
  selectedAttributesForVariants,
  selectedAttributeValueIds,
  generatedVariants: _generatedVariants,
  setFormData,
  setSelectedAttributesForVariants,
  setSelectedAttributeValueIds,
  setGeneratedVariants,
  setSimpleProductData: _setSimpleProductData,
  checkIsClothingCategory,
  isEditMode,
}: UseProductFormCallbacksProps) {
  const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setFormData((prev) => ({
      ...prev,
      title,
      slug: isEditMode ? prev.slug : syncSlugWithTitle(prev.title, prev.slug, title),
    }));
  };

  const isClothingCategory = () => checkIsClothingCategory(formData.primaryCategoryId, categories);

  const stripAttributeValuesFromVariants = (attributeId: string) => {
    const attribute = attributes.find((item) => item.id === attributeId);
    if (!attribute) {
      return;
    }
    const removedValueIds = new Set(attribute.values.map((value) => value.id));
    setGeneratedVariants((prev) =>
      prev.map((variant) => ({
        ...variant,
        selectedValueIds: variant.selectedValueIds.filter((valueId) => !removedValueIds.has(valueId)),
      }))
    );
  };

  const handleAttributeToggle = (attributeId: string, checked: boolean) => {
    if (checked) {
      setSelectedAttributesForVariants(new Set(selectedAttributesForVariants).add(attributeId));
      return;
    }
    handleAttributeRemove(attributeId);
  };

  const handleAttributeRemove = (attributeId: string) => {
    const newSet = new Set(selectedAttributesForVariants);
    newSet.delete(attributeId);
    const newValueIds = { ...selectedAttributeValueIds };
    delete newValueIds[attributeId];
    setSelectedAttributeValueIds(newValueIds);
    setSelectedAttributesForVariants(newSet);
    stripAttributeValuesFromVariants(attributeId);
  };

  const handleVariantDelete = (variantId: string) => {
    setGeneratedVariants((prev) => prev.filter((v) => v.id !== variantId));
  };

  const handleVariantAdd = () => {
    setGeneratedVariants((prev) => {
      const newVariant: GeneratedVariant = {
        id: `variant-${Date.now()}-${Math.random()}`,
        selectedValueIds: [],
        price: '0.00',
        compareAtPrice: '0.00',
        stock: '0',
        sku: nextVariantSku(formData.slug, prev),
        images: [],
      };
      const updated = [...prev, newVariant];
      console.log('✅ [VARIANT BUILDER] New manual variant added:', {
        newVariantId: newVariant.id,
        totalVariants: updated.length,
        manualVariants: updated.filter((v) => v.id !== 'variant-all').length,
        autoVariants: updated.filter((v) => v.id === 'variant-all').length,
      });
      return updated;
    });
  };

  return {
    handleTitleChange,
    isClothingCategory,
    handleAttributeToggle,
    handleAttributeRemove,
    handleVariantDelete,
    handleVariantAdd,
  };
}

