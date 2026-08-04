import type { FormEvent, MutableRefObject, Dispatch, SetStateAction } from 'react';
import { useRouter } from 'next/navigation';
import { convertPrice, type CurrencyCode } from '@/lib/currency';
import { showToast } from '@/components/Toast';
import type { Attribute, Variant, GeneratedVariant } from '../types';
import type { EditableProductSnapshot } from '../utils/editableProductSnapshot';
import { buildEditableProductSnapshot } from '../utils/editableProductSnapshot';
import {
  buildPartialProductUpdatePayload,
  type ProcessedVariantForSubmit,
} from '../utils/productUpdateDiff';
import { resolveVariantSku, ensureUniqueSku } from '../utils/variantSku';
import { useBrandAndCategoryCreation } from './useBrandAndCategoryCreation';
import { useVariantConversionToFormData } from './useVariantConversionToFormData';
import { useVariantValidation } from './useVariantValidation';
import { processImagesForSubmit } from './useImageProcessingForSubmit';
import { createAndSubmitPayload } from './useProductPayloadCreation';

function mergeAttributeIdsForProductSubmit(
  selectedIds: Set<string>,
  catalogAttributes: Attribute[],
  variantList: Array<{ options?: Array<{ attributeKey?: string }> }>,
  colorAttrId: string | undefined,
  sizeAttrId: string | undefined
): string[] {
  const out = new Set<string>(selectedIds);
  if (colorAttrId) out.add(colorAttrId);
  if (sizeAttrId) out.add(sizeAttrId);
  for (const v of variantList) {
    const opts = v.options;
    if (!opts) continue;
    for (const opt of opts) {
      const key = opt.attributeKey;
      if (!key) continue;
      const attr = catalogAttributes.find((a) => a.key === key);
      if (attr) out.add(attr.id);
    }
  }
  return Array.from(out);
}

function buildOptionsFromValueIds(
  valueIds: string[],
  attributes: Attribute[]
): Array<{ attributeKey: string; value: string; valueId?: string }> {
  const options: Array<{ attributeKey: string; value: string; valueId?: string }> = [];

  valueIds.forEach((valueId) => {
    const attribute = attributes.find((item) => item.values.some((value) => value.id === valueId));
    if (!attribute) {
      return;
    }
    const value = attribute.values.find((item) => item.id === valueId);
    if (value) {
      options.push({ attributeKey: attribute.key, value: value.value, valueId: value.id });
    }
  });

  return options;
}

function generateCombinations(groups: string[][]): string[][] {
  if (groups.length === 0) return [[]];
  if (groups.length === 1) return groups[0].map((value) => [value]);
  const [firstGroup, ...restGroups] = groups;
  const restCombinations = generateCombinations(restGroups);
  const result: string[][] = [];
  for (const value of firstGroup) {
    for (const combination of restCombinations) {
      result.push([value, ...combination]);
    }
  }
  return result;
}

interface ProductFormData {
  title: string;
  slug: string;
  descriptionHtml: string;
  brandIds: string[];
  primaryCategoryId: string;
  categoryIds: string[];
  published: boolean;
  featured: boolean;
  imageUrls: string[];
  featuredImageIndex: number;
  mainProductImage: string;
  variants: Variant[];
  labels: Array<{
    id?: string;
    type: 'text' | 'percentage';
    value: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    color?: string | null;
  }>;
}

interface UseProductFormHandlersProps {
  formData: ProductFormData;
  setFormData: Dispatch<SetStateAction<ProductFormData>>;
  setLoading: (loading: boolean) => void;
  setBrands: (updater: (prev: Array<{ id: string; name: string; slug: string }>) => Array<{ id: string; name: string; slug: string }>) => void;
  setCategories: (updater: (prev: Array<{ id: string; title: string; slug: string; parentId: string | null }>) => Array<{ id: string; title: string; slug: string; parentId: string | null }>) => void;
  productType: 'simple' | 'variable';
  simpleProductData: {
    price: string;
    compareAtPrice: string;
    sku: string;
    quantity: string;
  };
  simpleProductDatabaseVariantId?: string;
  selectedAttributesForVariants: Set<string>;
  generatedVariants: GeneratedVariant[];
  attributes: Attribute[];
  defaultCurrency: CurrencyCode;
  useNewBrand: boolean;
  newBrandName: string;
  useNewCategory: boolean;
  newCategoryName: string;
  isEditMode: boolean;
  productId: string | null;
  initialEditableProductRef: MutableRefObject<EditableProductSnapshot | null>;
  getColorAttribute: () => Attribute | undefined;
  getSizeAttribute: () => Attribute | undefined;
  isClothingCategory: () => boolean;
}

export function useProductFormHandlers({
  formData,
  setFormData,
  setLoading,
  setBrands,
  setCategories,
  productType,
  simpleProductData,
  simpleProductDatabaseVariantId,
  selectedAttributesForVariants,
  generatedVariants,
  attributes,
  defaultCurrency,
  useNewBrand,
  newBrandName,
  useNewCategory,
  newCategoryName,
  isEditMode,
  productId,
  initialEditableProductRef,
  getColorAttribute,
  getSizeAttribute,
  isClothingCategory,
}: UseProductFormHandlersProps) {
  const router = useRouter();

  const { createBrandAndCategory } = useBrandAndCategoryCreation({
    formData,
    useNewBrand,
    newBrandName,
    useNewCategory,
    newCategoryName,
    setBrands,
    setCategories,
    setLoading,
  });

  const { convertGeneratedVariantsToFormData } = useVariantConversionToFormData({
    productType,
    selectedAttributesForVariants,
    generatedVariants,
    attributes,
    formDataSlug: formData.slug,
    setFormData,
  });

  const { validateVariants } = useVariantValidation({
    productType,
    variants: formData.variants,
    simpleProductData,
    isClothingCategory,
    setLoading,
  });

  const processGeneratedVariant = (
    genVariant: GeneratedVariant,
    variantIndex: number,
    currentFormData: { slug: string },
    variantSkuSet: Set<string>
  ): ProcessedVariantForSubmit[] => {
    const variantPriceUSD = convertPrice(parseFloat(genVariant.price || '0'), defaultCurrency, 'USD');
    const variantCompareAtPriceUSD = genVariant.compareAtPrice
      ? convertPrice(parseFloat(genVariant.compareAtPrice), defaultCurrency, 'USD')
      : undefined;

    const basePayload = {
      price: variantPriceUSD,
      compareAtPrice: variantCompareAtPriceUSD,
      stock: parseInt(genVariant.stock || '0') || 0,
      imageUrl: genVariant.image || undefined,
      published: true,
    };

    if (genVariant.databaseVariantId) {
      const options = buildOptionsFromValueIds(genVariant.selectedValueIds, attributes);
      const sku = ensureUniqueSku(
        resolveVariantSku({
          databaseVariantId: genVariant.databaseVariantId,
          userSku: genVariant.sku,
          baseSlug: currentFormData.slug,
          valueParts: options.map((opt) => opt.value.toUpperCase().replace(/\s+/g, '-')),
          variantIndex,
          comboIndex: 0,
        }),
        variantSkuSet
      );

      return [
        {
          ...basePayload,
          databaseVariantId: genVariant.databaseVariantId,
          sku,
          options: options.length > 0 ? options : undefined,
        },
      ];
    }

    const attributeValueMap: Record<string, Array<{ valueId: string; value: string }>> = {};
    genVariant.selectedValueIds.forEach((valueId) => {
      const attribute = attributes.find((item) => item.values.some((value) => value.id === valueId));
      if (!attribute) {
        return;
      }
      const value = attribute.values.find((item) => item.id === valueId);
      if (!value) {
        return;
      }
      if (!attributeValueMap[attribute.key]) {
        attributeValueMap[attribute.key] = [];
      }
      attributeValueMap[attribute.key].push({ valueId: value.id, value: value.value });
    });

    const attributeKeys = Object.keys(attributeValueMap);
    if (attributeKeys.length === 0) {
      const sku = ensureUniqueSku(
        resolveVariantSku({
          userSku: genVariant.sku,
          baseSlug: currentFormData.slug,
          valueParts: [],
          variantIndex,
          comboIndex: 0,
        }),
        variantSkuSet
      );

      return [{ ...basePayload, sku }];
    }

    const combinations = generateCombinations(
      attributeKeys.map((key) => attributeValueMap[key].map((item) => item.valueId))
    );

    return combinations.map((combination, comboIndex) => {
      const variantOptions = buildOptionsFromValueIds(combination, attributes);
      const valueParts = variantOptions.map((opt) => opt.value.toUpperCase().replace(/\s+/g, '-'));
      const sku = ensureUniqueSku(
        resolveVariantSku({
          userSku: genVariant.sku,
          baseSlug: currentFormData.slug,
          valueParts,
          variantIndex,
          comboIndex,
        }),
        variantSkuSet
      );

      return {
        ...basePayload,
        sku,
        options: variantOptions.length > 0 ? variantOptions : undefined,
      };
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const brandCategoryResult = await createBrandAndCategory();
      if (brandCategoryResult.error) {
        return;
      }
      const { finalBrandIds, finalPrimaryCategoryId, creationMessages } = brandCategoryResult;

      convertGeneratedVariantsToFormData();

      const currentFormData = formData.variants.length > 0 ? formData : { ...formData, variants: [] };

      if (productType === 'variable' && currentFormData.variants.length === 0 && generatedVariants.length === 0) {
        setLoading(false);
        return;
      }
      if (!validateVariants()) {
        return;
      }

      const processedVariants: ProcessedVariantForSubmit[] = [];
      const variantSkuSet = new Set<string>();

      if (productType === 'simple') {
        const priceUSD = convertPrice(parseFloat(simpleProductData.price), defaultCurrency, 'USD');
        const compareAtPriceUSD =
          simpleProductData.compareAtPrice && simpleProductData.compareAtPrice.trim() !== ''
            ? convertPrice(parseFloat(simpleProductData.compareAtPrice), defaultCurrency, 'USD')
            : undefined;

        const sku = ensureUniqueSku(
          resolveVariantSku({
            databaseVariantId: simpleProductDatabaseVariantId,
            userSku: simpleProductData.sku,
            baseSlug: currentFormData.slug,
            valueParts: [],
            variantIndex: 0,
            comboIndex: 0,
          }),
          variantSkuSet
        );

        processedVariants.push({
          databaseVariantId: simpleProductDatabaseVariantId,
          price: priceUSD,
          stock: parseInt(simpleProductData.quantity) || 0,
          sku,
          compareAtPrice: compareAtPriceUSD,
          published: true,
        });
      } else {
        const useGeneratedVariants =
          generatedVariants.length > 0 && selectedAttributesForVariants.size > 0;

        if (useGeneratedVariants) {
          generatedVariants.forEach((genVariant, variantIndex) => {
            const rows = processGeneratedVariant(
              genVariant,
              variantIndex,
              currentFormData,
              variantSkuSet
            );
            processedVariants.push(...rows);
          });
        } else {
          currentFormData.variants.forEach((variant, variantIndex) => {
            const variantPriceUSD = convertPrice(parseFloat(variant.price || '0'), defaultCurrency, 'USD');
            const baseVariantData: ProcessedVariantForSubmit = {
              price: variantPriceUSD,
              stock: 0,
              sku: variant.sku?.trim() || '',
              published: true,
            };
            if (variant.compareAtPrice) {
              baseVariantData.compareAtPrice = convertPrice(
                parseFloat(variant.compareAtPrice),
                defaultCurrency,
                'USD'
              );
            }

            const colorDataArray = variant.colors || [];
            if (colorDataArray.length > 0) {
              colorDataArray.forEach((colorData, colorIndex) => {
                const colorSizes = colorData.sizes || [];
                const colorSizeStocks = colorData.sizeStocks || {};
                if (colorSizes.length > 0) {
                  colorSizes.forEach((size, sizeIndex) => {
                    const stockForVariant = colorSizeStocks[size] || colorData.stock || '0';
                    const valueParts = [colorData.colorValue, size]
                      .filter(Boolean)
                      .map((part) => part.toUpperCase().replace(/\s+/g, '-'));
                    const sku = ensureUniqueSku(
                      resolveVariantSku({
                        userSku: variant.sku || '',
                        baseSlug: currentFormData.slug,
                        valueParts,
                        variantIndex,
                        comboIndex: colorIndex * 100 + sizeIndex,
                      }),
                      variantSkuSet
                    );

                    const variantOptions: Array<{ attributeKey: string; value: string; valueId?: string }> = [];
                    if (colorData.colorValue?.trim()) {
                      const colorAttr = attributes.find((item) => item.key === 'color');
                      const colorValue = colorAttr?.values.find((item) => item.value === colorData.colorValue);
                      variantOptions.push({
                        attributeKey: 'color',
                        value: colorData.colorValue,
                        valueId: colorValue?.id,
                      });
                    }
                    if (size?.trim()) {
                      const sizeAttr = attributes.find((item) => item.key === 'size');
                      const sizeValue = sizeAttr?.values.find((item) => item.value === size);
                      variantOptions.push({
                        attributeKey: 'size',
                        value: size,
                        valueId: sizeValue?.id,
                      });
                    }

                    const sizePrice = colorData.sizePrices?.[size];
                    const finalPriceRaw =
                      sizePrice && sizePrice.trim() !== ''
                        ? parseFloat(sizePrice)
                        : colorData.price && colorData.price.trim() !== ''
                          ? parseFloat(colorData.price)
                          : baseVariantData.price;

                    processedVariants.push({
                      ...baseVariantData,
                      price: convertPrice(finalPriceRaw, defaultCurrency, 'USD'),
                      stock: parseInt(stockForVariant) || 0,
                      sku,
                      imageUrl:
                        colorData.images && colorData.images.length > 0
                          ? colorData.images.join(',')
                          : undefined,
                      options: variantOptions.length > 0 ? variantOptions : undefined,
                    });
                  });
                }
              });
            }
          });
        }
      }

      const submitVariants = processedVariants.map((variant) => ({
        ...(variant.databaseVariantId ? { id: variant.databaseVariantId } : {}),
        price: variant.price,
        compareAtPrice: variant.compareAtPrice,
        stock: variant.stock,
        sku: variant.sku,
        imageUrl: variant.imageUrl,
        published: variant.published,
        options: variant.options,
      }));

      const { finalMedia, mainImage, processedVariants: imageProcessedVariants } = processImagesForSubmit({
        imageUrls: currentFormData.imageUrls,
        featuredImageIndex: currentFormData.featuredImageIndex,
        mainProductImage: currentFormData.mainProductImage,
        variants: submitVariants,
      });

      const finalVariantsForApi = (imageProcessedVariants.length > 0 ? imageProcessedVariants : submitVariants).map(
        (variant, index) => ({
          ...processedVariants[index],
          ...(variant.imageUrl !== undefined ? { imageUrl: variant.imageUrl } : {}),
        })
      );

      const colorAttribute = getColorAttribute();
      const sizeAttribute = getSizeAttribute();
      const attributeIds = mergeAttributeIdsForProductSubmit(
        selectedAttributesForVariants,
        attributes,
        finalVariantsForApi,
        colorAttribute?.id,
        sizeAttribute?.id
      );

      if (isEditMode && productId) {
        const initialSnapshot = initialEditableProductRef.current;
        if (!initialSnapshot) {
          showToast('Product is still loading. Please wait and try again.', 'error');
          setLoading(false);
          return;
        }

        const currentSnapshot = buildEditableProductSnapshot({
          formData: {
            ...currentFormData,
            brandIds: finalBrandIds,
            primaryCategoryId: finalPrimaryCategoryId,
          },
          productType,
          simpleProductData,
          simpleProductDatabaseVariantId,
          selectedAttributesForVariants,
          generatedVariants,
        });

        const partialPayload = buildPartialProductUpdatePayload({
          initial: initialSnapshot,
          current: currentSnapshot,
          processedVariants: finalVariantsForApi,
          media: finalMedia,
        });

        await createAndSubmitPayload({
          formData: currentFormData,
          finalBrandIds,
          finalPrimaryCategoryId,
          variants: finalVariantsForApi,
          attributeIds,
          finalMedia,
          mainImage,
          isEditMode: true,
          productId,
          creationMessages,
          setLoading,
          router,
          partialPayload,
        });
        return;
      }

      await createAndSubmitPayload({
        formData: currentFormData,
        finalBrandIds,
        finalPrimaryCategoryId,
        variants: finalVariantsForApi.map((variant) => ({
          price: variant.price,
          compareAtPrice: variant.compareAtPrice,
          stock: variant.stock,
          sku: variant.sku,
          imageUrl: variant.imageUrl,
          published: variant.published,
          options: variant.options,
        })),
        attributeIds,
        finalMedia,
        mainImage,
        isEditMode,
        productId,
        creationMessages,
        setLoading,
        router,
      });
    } catch (err: unknown) {
      console.error('❌ [ADMIN] Error saving product:', err);
    } finally {
      setLoading(false);
    }
  };

  return { handleSubmit };
}
