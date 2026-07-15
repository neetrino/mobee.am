'use client';

import { useEffect, useRef, useState } from 'react';
import type { EditableProductSnapshot } from '../utils/editableProductSnapshot';
import { buildEditableProductSnapshot } from '../utils/editableProductSnapshot';
import type { GeneratedVariant, ProductLabel } from '../types';

interface UseInitialProductSnapshotProps {
  isEditMode: boolean;
  productId: string | null;
  hasVariantsToLoad: boolean;
  loadingProduct: boolean;
  formData: {
    title: string;
    slug: string;
    descriptionHtml: string;
    brandIds: string[];
    primaryCategoryId: string;
    categoryIds: string[];
    published: boolean;
    featured: boolean;
    imageUrls: string[];
    labels: ProductLabel[];
  };
  productType: 'simple' | 'variable';
  simpleProductData: {
    price: string;
    compareAtPrice: string;
    sku: string;
    quantity: string;
  };
  simpleProductDatabaseVariantId: string | undefined;
  selectedAttributesForVariants: Set<string>;
  generatedVariants: GeneratedVariant[];
}

export function useInitialProductSnapshot({
  isEditMode,
  productId,
  hasVariantsToLoad,
  loadingProduct,
  formData,
  productType,
  simpleProductData,
  simpleProductDatabaseVariantId,
  selectedAttributesForVariants,
  generatedVariants,
}: UseInitialProductSnapshotProps) {
  const initialEditableProductRef = useRef<EditableProductSnapshot | null>(null);
  const capturedRef = useRef(false);
  const [isSnapshotReady, setIsSnapshotReady] = useState(false);

  useEffect(() => {
    initialEditableProductRef.current = null;
    capturedRef.current = false;
    setIsSnapshotReady(false);
  }, [productId]);

  useEffect(() => {
    if (!isEditMode || !productId || loadingProduct || hasVariantsToLoad) {
      return;
    }

    if (capturedRef.current) {
      return;
    }

    if (productType === 'variable' && selectedAttributesForVariants.size > 0 && generatedVariants.length === 0) {
      return;
    }

    if (!formData.title.trim() && !formData.slug.trim()) {
      return;
    }

    initialEditableProductRef.current = buildEditableProductSnapshot({
      formData,
      productType,
      simpleProductData,
      simpleProductDatabaseVariantId,
      selectedAttributesForVariants,
      generatedVariants,
    });
    capturedRef.current = true;
    setIsSnapshotReady(true);
  }, [
    isEditMode,
    productId,
    hasVariantsToLoad,
    loadingProduct,
    formData,
    productType,
    simpleProductData,
    simpleProductDatabaseVariantId,
    selectedAttributesForVariants,
    generatedVariants,
  ]);

  return { initialEditableProductRef, isSnapshotReady };
}
