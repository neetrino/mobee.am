'use client';

import { useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { apiClient } from '../../../lib/api-client';
import { t } from '../../../lib/i18n';
import { ProductDescriptionSection } from './ProductDescriptionSection';
import { useAuth } from '../../../lib/auth/AuthContext';
import { showToast } from '../../../components/Toast';
import { ProductImageGallery } from './ProductImageGallery';
import { ProductInfoAndActions } from './ProductInfoAndActions';
import { useProductPage } from './useProductPage';
import type { Product } from './types';
import type { LanguageCode } from '../../../lib/language';
import { dispatchCartFlyAnimation } from '@/lib/cart/dispatchCartFlyAnimation';
import { resolveCartLineProductImageUrl } from '@/lib/cart/resolveCartLineProductImage';
import { resolveProductCardImageSrc } from '@/lib/productCardDisplayImage';
import { upsertGuestCartItem } from '@/lib/cart/guest-cart';
import { dispatchCartUpdated } from '@/lib/cart/dispatch-cart-updated';
import { formatPriceInCurrency } from '@/lib/currency';
import { buildRelatedProductsContextFromProduct } from '@/lib/products/build-related-context';
import { ProductImagePlaceholder } from '@/components/ProductImagePlaceholder';
import {
  PDP_IPAD_PRO_BAND_CLIP_HORIZONTAL_OVERFLOW_CLASS,
  PDP_IPAD_PRO_BAND_MAIN_SHELL_HORIZONTAL_CLASS,
} from './product-pdp-ipad-pro-band.constants';

const RelatedProducts = dynamic(
  () => import('../../../components/RelatedProducts').then((mod) => ({ default: mod.RelatedProducts })),
  {
    loading: () => (
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4" aria-hidden>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="aspect-[3/4] animate-pulse rounded-lg bg-gray-200" />
        ))}
      </div>
    ),
  },
);

export type ProductPageClientProps = {
  slug: string;
  variantIdFromUrl: string | null;
  colorFromUrl?: string | null;
  initialProduct: Product | null;
  initialLocale: LanguageCode;
  initialNotFound: boolean;
};

export function ProductPageClient({
  slug,
  variantIdFromUrl,
  colorFromUrl = null,
  initialProduct,
  initialLocale,
  initialNotFound,
}: ProductPageClientProps) {
  const { isLoggedIn } = useAuth();
  const addToCartInFlightRef = useRef(false);

  const scrollToProductDetails = () => {
    document.getElementById('product-long-description')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const {
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
    attributeGroups,
    colorGroups,
    sizeGroups,
    currentVariant,
    price,
    hasPrice,
    discountPercent,
    maxQuantity,
    isOutOfStock,
    isSingleVariantOutOfStock,
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
    galleryVariant,
  } = useProductPage({
    slug,
    variantIdFromUrl,
    colorFromUrl,
    initialProduct,
    initialLocale,
    initialNotFound,
  });

  const relatedContext = useMemo(
    () => (product ? buildRelatedProductsContextFromProduct(product) : null),
    [product],
  );

  const handleAddToCart = () => {
    if (!canAddToCart || !product || !currentVariant || addToCartInFlightRef.current || price == null) {
      return;
    }

    const flyEl = document.querySelector<HTMLElement>('[data-pdp-cart-fly-source]');
    const slideSrc = images[currentImageIndex];
    const flyUrl =
      typeof slideSrc === 'string' && slideSrc.length > 0 ? slideSrc : null;

    if (!isLoggedIn) {
      upsertGuestCartItem({
        productId: product.id,
        productSlug: product.slug,
        variantId: currentVariant.id,
        quantity,
        snapshot: {
          title: product.title,
          image: resolveCartLineProductImageUrl(
            { media: product.media },
            { imageUrl: currentVariant.imageUrl ?? null, media: currentVariant.media },
          ),
          price,
          originalPrice:
            currentVariant.compareAtPrice != null && currentVariant.compareAtPrice > price
              ? currentVariant.compareAtPrice
              : currentVariant.originalPrice ?? null,
          sku: currentVariant.sku,
          stock: currentVariant.stock,
        },
      });
      dispatchCartUpdated();
      dispatchCartFlyAnimation(flyUrl, flyEl);
      return;
    }

    addToCartInFlightRef.current = true;
    dispatchCartUpdated({
      optimisticAdd: { quantity, price: price ?? 0 },
    });
    dispatchCartFlyAnimation(flyUrl, flyEl);

    void (async () => {
      try {
        const response = await apiClient.post<{
          cartSummary?: { itemsCount: number; total: number };
        }>('/api/v1/cart/items', {
          productId: product.id,
          variantId: currentVariant.id,
          quantity,
        });
        if (response.cartSummary) {
          dispatchCartUpdated(response.cartSummary);
        } else {
          dispatchCartUpdated();
        }
      } catch {
        dispatchCartUpdated();
        showToast(t(language, 'product.errorAddingToCart'), 'error');
      } finally {
        addToCartInFlightRef.current = false;
      }
    })();
  };

  if (loading && !product && !shellProduct) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        {t(language, 'common.messages.loading')}
      </div>
    );
  }

  if (isNotFound) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        {t(language, 'common.messages.productNotFound')}
      </div>
    );
  }

  if (!product && shellProduct) {
    const shellImage = resolveProductCardImageSrc(shellProduct.image);
    return (
      <div
        className={`max-w-7xl mx-auto px-4 py-12 max-lg:pb-4 sm:px-6 lg:py-12 ${PDP_IPAD_PRO_BAND_MAIN_SHELL_HORIZONTAL_CLASS} ${PDP_IPAD_PRO_BAND_CLIP_HORIZONTAL_OVERFLOW_CLASS}`}
      >
        <div className="grid grid-cols-1 items-start gap-12 product-2col:grid-cols-[55%_45%] [&>*]:min-w-0">
          <div className="relative mx-auto aspect-square w-full max-w-lg">
            {shellImage ? (
              <Image
                src={shellImage}
                alt={shellProduct.title}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            ) : (
              <ProductImagePlaceholder
                className="h-full w-full rounded-lg"
                aria-label={`No image for ${shellProduct.title}`}
              />
            )}
          </div>
          <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-bold text-gray-900">{shellProduct.title}</h1>
            {shellProduct.brand?.name ? (
              <p className="text-sm text-gray-600">{shellProduct.brand.name}</p>
            ) : null}
            {shellProduct.hasPrice && shellProduct.price != null ? (
              <p className="text-xl font-semibold text-gray-900">
                {formatPriceInCurrency(shellProduct.price, currency)}
              </p>
            ) : (
              <p className="min-h-[1.75rem]" aria-hidden="true" />
            )}
            <p className="text-sm text-gray-500">{t(language, 'common.messages.loading')}</p>
            <p className="text-xs text-gray-400">{t(language, 'product.selectOptions')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        {t(language, 'common.messages.loading')}
      </div>
    );
  }

  return (
    <div
      className={`max-w-7xl mx-auto px-4 py-12 max-lg:pb-4 sm:px-6 lg:py-12 ${PDP_IPAD_PRO_BAND_MAIN_SHELL_HORIZONTAL_CLASS} ${PDP_IPAD_PRO_BAND_CLIP_HORIZONTAL_OVERFLOW_CLASS}`}
    >
      <div className="grid grid-cols-1 items-start gap-12 product-2col:grid-cols-[55%_45%] [&>*]:min-w-0">
        <ProductImageGallery
          key={galleryVariant?.id ?? selectedColor ?? product.id}
          images={images}
          product={product}
          discountPercent={discountPercent}
          language={language}
          currentImageIndex={currentImageIndex}
          onImageIndexChange={setCurrentImageIndex}
          thumbnailStartIndex={thumbnailStartIndex}
          onThumbnailStartIndexChange={setThumbnailStartIndex}
        />

        <ProductInfoAndActions
          product={product}
          price={price}
          hasPrice={hasPrice}
          discountPercent={discountPercent}
          currency={currency}
          language={language}
          quantity={quantity}
          maxQuantity={maxQuantity}
          isOutOfStock={isOutOfStock}
          isSingleVariantOutOfStock={isSingleVariantOutOfStock}
          isVariationRequired={isVariationRequired}
          hasUnavailableAttributes={hasUnavailableAttributes}
          unavailableAttributes={unavailableAttributes}
          canAddToCart={canAddToCart}
          isInWishlist={isInWishlist}
          isInCompare={isInCompare}
          currentVariant={currentVariant}
          attributeGroups={attributeGroups}
          selectedColor={selectedColor}
          selectedSize={selectedSize}
          selectedAttributeValues={selectedAttributeValues}
          colorGroups={colorGroups}
          sizeGroups={sizeGroups}
          onQuantityAdjust={adjustQuantity}
          onAddToCart={handleAddToCart}
          onAddToWishlist={handleAddToWishlist}
          onCompareToggle={handleCompareToggle}
          onScrollToDetails={scrollToProductDetails}
          onColorSelect={handleColorSelect}
          onSizeSelect={handleSizeSelect}
          onAttributeValueSelect={handleAttributeValueSelect}
          getOptionValue={getOptionValue}
          getRequiredAttributesMessage={getRequiredAttributesMessage}
        />
      </div>

      <ProductDescriptionSection
        product={product}
        language={language}
        mainImageUrl={images[0]}
      />

      <div className="mt-16">
        <RelatedProducts
          currentProductSlug={product.slug}
          relatedContext={relatedContext}
        />
      </div>
    </div>
  );
}
