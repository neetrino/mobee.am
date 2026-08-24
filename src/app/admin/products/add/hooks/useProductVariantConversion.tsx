'use client';

import { useEffect } from 'react';
import type { CurrencyCode } from '@/lib/currency';
import type { Attribute, GeneratedVariant } from '../types';
import {
  convertApiVariantsToGenerated,
  type ApiProductVariant,
} from '../utils/convertApiVariantsToGenerated';

interface UseProductVariantConversionProps {
  productId: string | null;
  attributes: Attribute[];
  defaultCurrency: CurrencyCode;
  /** When product edit load finishes with variants, re-run conversion (fixes race if catalog attributes loaded before product JSON). */
  hasVariantsToLoad: boolean;
  setSelectedAttributesForVariants: (attrs: Set<string>) => void;
  setSelectedAttributeValueIds: (ids: Record<string, string[]>) => void;
  setGeneratedVariants: (variants: GeneratedVariant[]) => void;
  setHasVariantsToLoad: (has: boolean) => void;
}

export function useProductVariantConversion({
  productId,
  attributes,
  defaultCurrency,
  hasVariantsToLoad,
  setSelectedAttributesForVariants,
  setSelectedAttributeValueIds,
  setGeneratedVariants,
  setHasVariantsToLoad,
}: UseProductVariantConversionProps) {
  useEffect(() => {
    if (productId && attributes.length > 0 && (window as Window & { __productVariantsToConvert?: ApiProductVariant[] }).__productVariantsToConvert) {
      const productVariants = (window as Window & { __productVariantsToConvert?: ApiProductVariant[] }).__productVariantsToConvert!;
      const attributeIdsSet = new Set<string>();
      const attributeValueIdsMap: Record<string, string[]> = {};

      productVariants.forEach((variant) => {
        if (variant.options && Array.isArray(variant.options)) {
          variant.options.forEach((opt) => {
            let attributeId = opt.attributeId;
            let valueId = opt.valueId;

            if (!attributeId && opt.attributeValue) {
              attributeId = opt.attributeValue.attributeId || opt.attributeValue.attribute?.id;
            }
            if (!valueId && opt.attributeValue) {
              valueId = opt.attributeValue.id;
            }

            if (attributeId && valueId) {
              attributeIdsSet.add(attributeId);

              if (!attributeValueIdsMap[attributeId]) {
                attributeValueIdsMap[attributeId] = [];
              }
              if (!attributeValueIdsMap[attributeId].includes(valueId)) {
                attributeValueIdsMap[attributeId].push(valueId);
              }
            }
          });
        }
      });

      const productAttributeIds = (window as Window & { __productAttributeIds?: string[] }).__productAttributeIds || [];
      productAttributeIds.forEach((attrId: string) => {
        attributeIdsSet.add(attrId);
      });

      if (attributeIdsSet.size > 0) {
        setSelectedAttributesForVariants(attributeIdsSet);
      }

      if (Object.keys(attributeValueIdsMap).length > 0) {
        setSelectedAttributeValueIds(attributeValueIdsMap);
      }

      const convertedVariants = convertApiVariantsToGenerated(
        productVariants,
        attributes,
        defaultCurrency
      );

      if (convertedVariants.length > 0) {
        setGeneratedVariants(convertedVariants);
        delete (window as Window & { __productVariantsToConvert?: ApiProductVariant[] }).__productVariantsToConvert;
        delete (window as Window & { __productAttributeIds?: string[] }).__productAttributeIds;
        setHasVariantsToLoad(false);
      } else {
        setHasVariantsToLoad(false);
      }
    } else if (
      productId &&
      attributes.length > 0 &&
      Array.isArray((window as Window & { __productAttributeIds?: string[] }).__productAttributeIds) &&
      (window as Window & { __productAttributeIds?: string[] }).__productAttributeIds!.length > 0 &&
      !(window as Window & { __productVariantsToConvert?: ApiProductVariant[] }).__productVariantsToConvert
    ) {
      const pendingIds = (window as Window & { __productAttributeIds?: string[] }).__productAttributeIds!;
      setSelectedAttributesForVariants(new Set(pendingIds));
      delete (window as Window & { __productAttributeIds?: string[] }).__productAttributeIds;
    }
  }, [
    productId,
    attributes,
    defaultCurrency,
    hasVariantsToLoad,
    setSelectedAttributesForVariants,
    setSelectedAttributeValueIds,
    setGeneratedVariants,
    setHasVariantsToLoad,
  ]);
}
