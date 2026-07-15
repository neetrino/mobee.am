'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { useTranslation } from '../../../../lib/i18n-client';
import { AdminContentSkeleton } from '../../components/AdminContentSkeleton';
import { PageHeader } from './components/PageHeader';
import { useProductFormState } from './hooks/useProductFormState';
import { useProductDataLoading } from './hooks/useProductDataLoading';
import { useProductEditMode } from './hooks/useProductEditMode';
import { useProductVariantConversion } from './hooks/useProductVariantConversion';
import { useVariantGeneration } from './hooks/useVariantGeneration';
import { useImageHandling } from './hooks/useImageHandling';
import { useLabelManagement } from './hooks/useLabelManagement';
import { useProductAttributeHelpers } from './hooks/useProductAttributeHelpers';
import { useProductAttributeHandlers } from './hooks/useProductAttributeHandlers';
import { useProductFormHandlers } from './hooks/useProductFormHandlers';
import { useProductFormCallbacks } from './hooks/useProductFormCallbacks';
import { useInitialProductSnapshot } from './hooks/useInitialProductSnapshot';
import { isClothingCategory as checkIsClothingCategory, generateSlug } from './utils/productUtils';

const AddProductFormContent = dynamic(
  () => import('./components/AddProductFormContent').then((module) => ({ default: module.AddProductFormContent })),
  { loading: () => <AdminContentSkeleton lines={6} /> },
);

const ValueSelectionModal = dynamic(
  () => import('./components/ValueSelectionModal').then((module) => ({ default: module.ValueSelectionModal })),
  { loading: () => null },
);

function AddProductPageContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const productId = searchParams.get('id');
  const isEditMode = !!productId;

  const formState = useProductFormState();

  useProductDataLoading({
    setBrands: formState.setBrands,
    setCategories: formState.setCategories,
    setAttributes: formState.setAttributes,
    setDefaultCurrency: formState.setDefaultCurrency,
    attributesDropdownOpen: formState.attributesDropdownOpen,
    setAttributesDropdownOpen: formState.setAttributesDropdownOpen,
    attributesDropdownRef: formState.attributesDropdownRef,
    categoriesExpanded: formState.categoriesExpanded,
    setCategoriesExpanded: formState.setCategoriesExpanded,
    brandsExpanded: formState.brandsExpanded,
    setBrandsExpanded: formState.setBrandsExpanded,
  });

  useProductEditMode({
    productId,
    attributes: formState.attributes,
    defaultCurrency: formState.defaultCurrency,
    setLoadingProduct: formState.setLoadingProduct,
    setFormData: formState.setFormData,
    setUseNewBrand: formState.setUseNewBrand,
    setUseNewCategory: formState.setUseNewCategory,
    setNewBrandName: formState.setNewBrandName,
    setNewCategoryName: formState.setNewCategoryName,
    setHasVariantsToLoad: formState.setHasVariantsToLoad,
    setProductType: formState.setProductType,
    setSimpleProductData: formState.setSimpleProductData,
    setSimpleProductDatabaseVariantId: formState.setSimpleProductDatabaseVariantId,
  });

  useProductVariantConversion({
    productId,
    attributes: formState.attributes,
    defaultCurrency: formState.defaultCurrency,
    hasVariantsToLoad: formState.hasVariantsToLoad,
    setSelectedAttributesForVariants: formState.setSelectedAttributesForVariants,
    setSelectedAttributeValueIds: formState.setSelectedAttributeValueIds,
    setGeneratedVariants: formState.setGeneratedVariants,
    setHasVariantsToLoad: formState.setHasVariantsToLoad,
  });

  const { applyToAllVariants } = useVariantGeneration({
    selectedAttributesForVariants: formState.selectedAttributesForVariants,
    selectedAttributeValueIds: formState.selectedAttributeValueIds,
    attributes: formState.attributes,
    generatedVariants: formState.generatedVariants,
    formDataSlug: formState.formData.slug,
    formDataTitle: formState.formData.title,
    isEditMode,
    productId,
    setGeneratedVariants: formState.setGeneratedVariants,
  });

  const {
    handleTitleChange,
    isClothingCategory,
    handleAttributeToggle,
    handleAttributeRemove,
    handleVariantDelete,
    handleVariantAdd,
  } = useProductFormCallbacks({
    formData: formState.formData,
    categories: formState.categories,
    selectedAttributesForVariants: formState.selectedAttributesForVariants,
    selectedAttributeValueIds: formState.selectedAttributeValueIds,
    generatedVariants: formState.generatedVariants,
    setFormData: formState.setFormData,
    setSelectedAttributesForVariants: formState.setSelectedAttributesForVariants,
    setSelectedAttributeValueIds: formState.setSelectedAttributeValueIds,
    setGeneratedVariants: formState.setGeneratedVariants,
    setSimpleProductData: formState.setSimpleProductData,
    checkIsClothingCategory,
  });

  const {
    addImageUrl: _addImageUrl,
    removeImageUrl,
    setFeaturedImage,
    handleUploadImages,
    handleUploadVariantImage,
  } = useImageHandling({
    imageUrls: formState.formData.imageUrls,
    featuredImageIndex: formState.formData.featuredImageIndex,
    variants: formState.formData.variants,
    generatedVariants: formState.generatedVariants,
    colorImageTarget: formState.colorImageTarget,
    setImageUrls: (updater) => formState.setFormData((prev) => ({ ...prev, imageUrls: updater(prev.imageUrls) })),
    setFeaturedImageIndex: (index) => formState.setFormData((prev) => ({ ...prev, featuredImageIndex: index })),
    setMainProductImage: (image) => formState.setFormData((prev) => ({ ...prev, mainProductImage: image })),
    setVariants: (updater) => formState.setFormData((prev) => ({ ...prev, variants: updater(prev.variants) })),
    setGeneratedVariants: formState.setGeneratedVariants,
    setImageUploadLoading: formState.setImageUploadLoading,
    setImageUploadError: formState.setImageUploadError,
    setColorImageTarget: formState.setColorImageTarget,
    t,
  });

  const { addLabel, removeLabel, updateLabel } = useLabelManagement(
    formState.formData.labels,
    (updater) => formState.setFormData((prev) => ({ ...prev, labels: updater(prev.labels) }))
  );

  const { getColorAttribute, getSizeAttribute } = useProductAttributeHelpers({
    attributes: formState.attributes,
  });

  useProductAttributeHandlers({
    attributes: formState.attributes,
    setAttributes: formState.setAttributes,
    getColorAttribute,
    getSizeAttribute,
  });

  const { initialEditableProductRef, isSnapshotReady } = useInitialProductSnapshot({
    isEditMode,
    productId,
    hasVariantsToLoad: formState.hasVariantsToLoad,
    loadingProduct: formState.loadingProduct,
    formData: formState.formData,
    productType: formState.productType,
    simpleProductData: formState.simpleProductData,
    simpleProductDatabaseVariantId: formState.simpleProductDatabaseVariantId,
    selectedAttributesForVariants: formState.selectedAttributesForVariants,
    generatedVariants: formState.generatedVariants,
  });

  const { handleSubmit } = useProductFormHandlers({
    formData: formState.formData,
    setFormData: formState.setFormData,
    setLoading: formState.setLoading,
    setBrands: formState.setBrands,
    setCategories: formState.setCategories,
    productType: formState.productType,
    simpleProductData: formState.simpleProductData,
    simpleProductDatabaseVariantId: formState.simpleProductDatabaseVariantId,
    selectedAttributesForVariants: formState.selectedAttributesForVariants,
    generatedVariants: formState.generatedVariants,
    attributes: formState.attributes,
    defaultCurrency: formState.defaultCurrency,
    useNewBrand: formState.useNewBrand,
    newBrandName: formState.newBrandName,
    useNewCategory: formState.useNewCategory,
    newCategoryName: formState.newCategoryName,
    isEditMode,
    productId,
    initialEditableProductRef,
    getColorAttribute,
    getSizeAttribute,
    isClothingCategory,
  });

  if (formState.loadingProduct) {
    return (
      <div className="mx-auto w-full max-w-7xl py-8">
        <AdminContentSkeleton lines={6} />
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto w-full max-w-7xl">
        <PageHeader isEditMode={isEditMode} />

        <AddProductFormContent
          formData={formState.formData}
          productType={formState.productType}
          simpleProductData={formState.simpleProductData}
          categories={formState.categories}
          brands={formState.brands}
          attributes={formState.attributes}
          defaultCurrency={formState.defaultCurrency}
          isEditMode={isEditMode}
          loading={formState.loading}
          isSnapshotReady={isSnapshotReady}
          imageUploadLoading={formState.imageUploadLoading}
          imageUploadError={formState.imageUploadError}
          categoriesExpanded={formState.categoriesExpanded}
          brandsExpanded={formState.brandsExpanded}
          useNewCategory={formState.useNewCategory}
          useNewBrand={formState.useNewBrand}
          newCategoryName={formState.newCategoryName}
          newBrandName={formState.newBrandName}
          selectedAttributesForVariants={formState.selectedAttributesForVariants}
          selectedAttributeValueIds={formState.selectedAttributeValueIds}
          attributesDropdownOpen={formState.attributesDropdownOpen}
          generatedVariants={formState.generatedVariants}
          hasVariantsToLoad={formState.hasVariantsToLoad}
          fileInputRef={formState.fileInputRef}
          attributesDropdownRef={formState.attributesDropdownRef}
          variantImageInputRefs={formState.variantImageInputRefs}
          onTitleChange={handleTitleChange}
          onSlugChange={(e) => formState.setFormData((prev) => ({ ...prev, slug: e.target.value }))}
          onDescriptionChange={(e) => formState.setFormData((prev) => ({ ...prev, descriptionHtml: e.target.value }))}
          onProductTypeChange={formState.setProductType}
          onUploadImages={handleUploadImages}
          onRemoveImage={removeImageUrl}
          onSetFeaturedImage={setFeaturedImage}
          onCategoriesExpandedChange={formState.setCategoriesExpanded}
          onBrandsExpandedChange={formState.setBrandsExpanded}
          onUseNewCategoryChange={formState.setUseNewCategory}
          onUseNewBrandChange={formState.setUseNewBrand}
          onNewCategoryNameChange={formState.setNewCategoryName}
          onNewBrandNameChange={formState.setNewBrandName}
          onCategoryIdsChange={(ids) => formState.setFormData((prev) => ({ ...prev, categoryIds: ids }))}
          onBrandIdsChange={(ids) => formState.setFormData((prev) => ({ ...prev, brandIds: ids }))}
          onPrimaryCategoryIdChange={(id) => formState.setFormData((prev) => ({ ...prev, primaryCategoryId: id }))}
          onPriceChange={(value) => formState.setSimpleProductData((prev) => ({ ...prev, price: value }))}
          onCompareAtPriceChange={(value) => formState.setSimpleProductData((prev) => ({ ...prev, compareAtPrice: value }))}
          onSkuChange={(value) => formState.setSimpleProductData((prev) => ({ ...prev, sku: value }))}
          onQuantityChange={(value) => formState.setSimpleProductData((prev) => ({ ...prev, quantity: value }))}
          onAttributesDropdownToggle={() => formState.setAttributesDropdownOpen(!formState.attributesDropdownOpen)}
          onAttributeToggle={handleAttributeToggle}
          onAttributeRemove={handleAttributeRemove}
          onVariantUpdate={formState.setGeneratedVariants}
          onVariantDelete={handleVariantDelete}
          onVariantAdd={handleVariantAdd}
          onVariantImageUpload={(variantId, event) => handleUploadVariantImage(variantId, event)}
          onOpenValueModal={formState.setOpenValueModal}
          onAddLabel={addLabel}
          onRemoveLabel={removeLabel}
          onUpdateLabel={(index, field, value) => updateLabel(index, field, value)}
          onFeaturedChange={(featured) => formState.setFormData((prev) => ({ ...prev, featured }))}
          onVariantsUpdate={(updater) => formState.setFormData((prev) => ({ ...prev, variants: updater(prev.variants) }))}
          onApplyToAllVariants={(field, value) => applyToAllVariants(field, value)}
          isClothingCategory={isClothingCategory}
          generateSlug={generateSlug}
          handleSubmit={handleSubmit}
        />
      </div>

      {formState.openValueModal && (
        <ValueSelectionModal
          openValueModal={formState.openValueModal}
          variant={formState.generatedVariants.find((v) => v.id === formState.openValueModal!.variantId)}
          attribute={formState.attributes.find((a) => a.id === formState.openValueModal!.attributeId)}
          selectedAttributeValueIds={formState.selectedAttributeValueIds}
          onClose={() => formState.setOpenValueModal(null)}
          onVariantUpdate={formState.setGeneratedVariants}
          onAttributeValueIdsUpdate={formState.setSelectedAttributeValueIds}
        />
      )}
    </>
  );
}

export default function AddProductPage() {
  return (
    <Suspense fallback={<AdminContentSkeleton lines={6} />}>
      <AddProductPageContent />
    </Suspense>
  );
}
