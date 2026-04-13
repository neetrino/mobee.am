'use client';

import type { ChangeEvent } from 'react';
import { Card } from '@shop/ui';
import type {
  Brand,
  Category,
  Attribute,
  Variant,
  ProductLabel,
  GeneratedVariant,
} from '../types';
import type { CurrencyCode } from '@/lib/currency';
import { BasicInformation } from './BasicInformation';
import { ProductImages } from './ProductImages';
import { CategoriesBrands } from './CategoriesBrands';
import { SimpleProductFields } from './SimpleProductFields';
import { AttributesSelection } from './AttributesSelection';
import { VariantBuilder } from './VariantBuilder';
import { ProductLabels } from './ProductLabels';
import { Publishing } from './Publishing';
import { FormActions } from './FormActions';

interface AddProductFormContentProps {
  formData: {
    title: string;
    slug: string;
    descriptionHtml: string;
    brandIds: string[];
    categoryIds: string[];
    primaryCategoryId: string;
    imageUrls: string[];
    featuredImageIndex: number;
    labels: ProductLabel[];
    featured: boolean;
    variants: Variant[];
  };
  productType: 'simple' | 'variable';
  simpleProductData: {
    price: string;
    compareAtPrice: string;
    sku: string;
    quantity: string;
  };
  categories: Category[];
  brands: Brand[];
  attributes: Attribute[];
  defaultCurrency: CurrencyCode;
  isEditMode: boolean;
  loading: boolean;
  imageUploadLoading: boolean;
  imageUploadError: string | null;
  categoriesExpanded: boolean;
  brandsExpanded: boolean;
  useNewCategory: boolean;
  useNewBrand: boolean;
  newCategoryName: string;
  newBrandName: string;
  selectedAttributesForVariants: Set<string>;
  selectedAttributeValueIds: Record<string, string[]>;
  attributesDropdownOpen: boolean;
  generatedVariants: GeneratedVariant[];
  hasVariantsToLoad: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  attributesDropdownRef: React.RefObject<HTMLDivElement>;
  variantImageInputRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
  onTitleChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onSlugChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onDescriptionChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onProductTypeChange: (type: 'simple' | 'variable') => void;
  onUploadImages: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  onRemoveImage: (index: number) => void;
  onSetFeaturedImage: (index: number) => void;
  onCategoriesExpandedChange: (expanded: boolean) => void;
  onBrandsExpandedChange: (expanded: boolean) => void;
  onUseNewCategoryChange: (use: boolean) => void;
  onUseNewBrandChange: (use: boolean) => void;
  onNewCategoryNameChange: (name: string) => void;
  onNewBrandNameChange: (name: string) => void;
  onCategoryIdsChange: (ids: string[]) => void;
  onBrandIdsChange: (ids: string[]) => void;
  onPrimaryCategoryIdChange: (id: string) => void;
  onPriceChange: (value: string) => void;
  onCompareAtPriceChange: (value: string) => void;
  onSkuChange: (value: string) => void;
  onQuantityChange: (value: string) => void;
  onAttributesDropdownToggle: () => void;
  onAttributeToggle: (attributeId: string, checked: boolean) => void;
  onAttributeRemove: (attributeId: string) => void;
  onVariantUpdate: (variants: GeneratedVariant[] | ((prev: GeneratedVariant[]) => GeneratedVariant[])) => void;
  onVariantDelete: (variantId: string) => void;
  onVariantAdd: () => void;
  onVariantImageUpload: (variantId: string, event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  onOpenValueModal: (modal: { variantId: string; attributeId: string } | null) => void;
  onAddLabel: () => void;
  onRemoveLabel: (index: number) => void;
  onUpdateLabel: (index: number, field: keyof ProductLabel, value: any) => void;
  onFeaturedChange: (featured: boolean) => void;
  onVariantsUpdate: (updater: (prev: Variant[]) => Variant[]) => void;
  onApplyToAllVariants: (field: 'price' | 'compareAtPrice' | 'stock' | 'sku', value: string) => void;
  isClothingCategory: () => boolean;
  generateSlug: (text: string) => string;
  handleSubmit: (e: React.FormEvent) => void;
}

export function AddProductFormContent({
  formData,
  productType,
  simpleProductData,
  categories,
  brands,
  attributes,
  defaultCurrency,
  isEditMode,
  loading,
  imageUploadLoading,
  imageUploadError,
  categoriesExpanded,
  brandsExpanded,
  useNewCategory,
  useNewBrand,
  newCategoryName,
  newBrandName,
  selectedAttributesForVariants,
  selectedAttributeValueIds,
  attributesDropdownOpen,
  generatedVariants,
  hasVariantsToLoad,
  fileInputRef,
  attributesDropdownRef,
  variantImageInputRefs,
  onTitleChange,
  onSlugChange,
  onDescriptionChange,
  onProductTypeChange,
  onUploadImages,
  onRemoveImage,
  onSetFeaturedImage,
  onCategoriesExpandedChange,
  onBrandsExpandedChange,
  onUseNewCategoryChange,
  onUseNewBrandChange,
  onNewCategoryNameChange,
  onNewBrandNameChange,
  onCategoryIdsChange,
  onBrandIdsChange,
  onPrimaryCategoryIdChange,
  onPriceChange,
  onCompareAtPriceChange,
  onSkuChange,
  onQuantityChange,
  onAttributesDropdownToggle,
  onAttributeToggle,
  onAttributeRemove,
  onVariantUpdate,
  onVariantDelete,
  onVariantAdd,
  onVariantImageUpload,
  onOpenValueModal,
  onAddLabel,
  onRemoveLabel,
  onUpdateLabel,
  onFeaturedChange,
  onVariantsUpdate,
  onApplyToAllVariants,
  isClothingCategory,
  generateSlug,
  handleSubmit,
}: AddProductFormContentProps) {
  return (
    <Card className="p-6 pb-24 sm:pb-24">
      <form onSubmit={handleSubmit} className="space-y-14">
        <BasicInformation
          productType={productType}
          setProductType={onProductTypeChange}
          title={formData.title}
          slug={formData.slug}
          descriptionHtml={formData.descriptionHtml}
          onTitleChange={onTitleChange}
          onSlugChange={onSlugChange}
          onDescriptionChange={onDescriptionChange}
        />

        <ProductImages
          imageUrls={formData.imageUrls}
          featuredImageIndex={formData.featuredImageIndex}
          imageUploadLoading={imageUploadLoading}
          imageUploadError={imageUploadError}
          fileInputRef={fileInputRef}
          onUploadImages={onUploadImages}
          onRemoveImage={onRemoveImage}
          onSetFeaturedImage={onSetFeaturedImage}
        />

        <CategoriesBrands
          categories={categories}
          brands={brands}
          categoryIds={formData.categoryIds}
          brandIds={formData.brandIds}
          categoriesExpanded={categoriesExpanded}
          brandsExpanded={brandsExpanded}
          useNewCategory={useNewCategory}
          useNewBrand={useNewBrand}
          newCategoryName={newCategoryName}
          newBrandName={newBrandName}
          onCategoriesExpandedChange={onCategoriesExpandedChange}
          onBrandsExpandedChange={onBrandsExpandedChange}
          onUseNewCategoryChange={onUseNewCategoryChange}
          onUseNewBrandChange={onUseNewBrandChange}
          onNewCategoryNameChange={onNewCategoryNameChange}
          onNewBrandNameChange={onNewBrandNameChange}
          onCategoryIdsChange={onCategoryIdsChange}
          onBrandIdsChange={onBrandIdsChange}
          onPrimaryCategoryIdChange={onPrimaryCategoryIdChange}
          isClothingCategory={isClothingCategory}
          onVariantsUpdate={onVariantsUpdate}
        />

        {productType === 'simple' && (
          <SimpleProductFields
            price={simpleProductData.price}
            compareAtPrice={simpleProductData.compareAtPrice}
            sku={simpleProductData.sku}
            quantity={simpleProductData.quantity}
            defaultCurrency={defaultCurrency}
            onPriceChange={onPriceChange}
            onCompareAtPriceChange={onCompareAtPriceChange}
            onSkuChange={onSkuChange}
            onQuantityChange={onQuantityChange}
          />
        )}

        {productType === 'variable' && (
          <AttributesSelection
            attributes={attributes}
            selectedAttributesForVariants={selectedAttributesForVariants}
            selectedAttributeValueIds={selectedAttributeValueIds}
            attributesDropdownOpen={attributesDropdownOpen}
            attributesDropdownRef={attributesDropdownRef}
            onAttributesDropdownToggle={onAttributesDropdownToggle}
            onAttributeToggle={onAttributeToggle}
            onAttributeRemove={onAttributeRemove}
          />
        )}

        {productType === 'variable' &&
          ((isEditMode && (generatedVariants.length > 0 || hasVariantsToLoad)) ||
            selectedAttributesForVariants.size > 0) && (
            <VariantBuilder
              generatedVariants={generatedVariants}
              attributes={attributes}
              selectedAttributesForVariants={selectedAttributesForVariants}
              isEditMode={isEditMode}
              hasVariantsToLoad={hasVariantsToLoad}
              defaultCurrency={defaultCurrency}
              imageUploadLoading={imageUploadLoading}
              slug={formData.slug}
              title={formData.title}
              variantImageInputRefs={variantImageInputRefs}
              onVariantUpdate={onVariantUpdate}
              onVariantDelete={onVariantDelete}
              onVariantAdd={onVariantAdd}
              onApplyToAll={onApplyToAllVariants}
              onVariantImageUpload={onVariantImageUpload}
              onOpenValueModal={onOpenValueModal}
              generateSlug={generateSlug}
            />
          )}

        <ProductLabels
          labels={formData.labels}
          onAddLabel={onAddLabel}
          onRemoveLabel={onRemoveLabel}
          onUpdateLabel={onUpdateLabel}
        />

        <Publishing featured={formData.featured} onFeaturedChange={onFeaturedChange} />

        <FormActions loading={loading} isEditMode={isEditMode} />
      </form>
    </Card>
  );
}

