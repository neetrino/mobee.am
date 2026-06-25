'use client';

import { useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { apiClient } from '../../../lib/api-client';
import { t, getProductText } from '../../../lib/i18n';
import { sanitizeHtml } from '../../../lib/utils/sanitize';
import { useAuth } from '../../../lib/auth/AuthContext';
import { showToast } from '../../../components/Toast';
import { ProductImageGallery } from './ProductImageGallery';
import { ProductInfoAndActions } from './ProductInfoAndActions';
import { useProductPage } from './useProductPage';
import type { Product } from './types';
import type { LanguageCode } from '../../../lib/language';
import { dispatchCartFlyAnimation } from '@/lib/cart/dispatchCartFlyAnimation';
import { PRODUCT_CARD_DISPLAY_IMAGE_SRC, resolveProductCardImageSrc } from '@/lib/productCardDisplayImage';
import { upsertGuestCartItem } from '@/lib/cart/guest-cart';
import { formatPriceInCurrency } from '@/lib/currency';
import { buildRelatedProductsContextFromProduct } from '@/lib/products/build-related-context';
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
  initialProduct: Product | null;
  initialLocale: LanguageCode;
  initialNotFound: boolean;
};

export function ProductPageClient({
  slug,
  variantIdFromUrl,
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
  } = useProductPage({
    slug,
    variantIdFromUrl,
    initialProduct,
    initialLocale,
    initialNotFound,
  });

  const relatedContext = useMemo(
    () => (product ? buildRelatedProductsContextFromProduct(product) : null),
    [product],
  );

  const handleAddToCart = () => {
    if (!canAddToCart || !product || !currentVariant || addToCartInFlightRef.current) {
      return;
    }

    const flyEl = document.querySelector<HTMLElement>('[data-pdp-cart-fly-source]');
    const slideSrc = images[currentImageIndex];
    const flyUrl =
      typeof slideSrc === 'string' && slideSrc.length > 0 ? slideSrc : PRODUCT_CARD_DISPLAY_IMAGE_SRC;

    if (!isLoggedIn) {
      upsertGuestCartItem({
        productId: product.id,
        productSlug: product.slug,
        variantId: currentVariant.id,
        quantity,
      });
      window.dispatchEvent(new Event('cart-updated'));
      dispatchCartFlyAnimation(flyUrl, flyEl);
      return;
    }

    addToCartInFlightRef.current = true;
    window.dispatchEvent(
      new CustomEvent('cart-updated', {
        detail: { optimisticAdd: { quantity, price } },
      }),
    );
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
        window.dispatchEvent(
          new CustomEvent('cart-updated', {
            detail: response.cartSummary ?? null,
          }),
        );
      } catch {
        window.dispatchEvent(new Event('cart-updated'));
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
            <Image
              src={shellImage}
              alt={shellProduct.title}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          </div>
          <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-bold text-gray-900">{shellProduct.title}</h1>
            {shellProduct.brand?.name ? (
              <p className="text-sm text-gray-600">{shellProduct.brand.name}</p>
            ) : null}
            <p className="text-xl font-semibold text-gray-900">
              {formatPriceInCurrency(shellProduct.price, currency)}
            </p>
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
          discountPercent={discountPercent}
          currency={currency}
          language={language}
          quantity={quantity}
          maxQuantity={maxQuantity}
          isOutOfStock={isOutOfStock}
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

      <section
        id="product-long-description"
        className="mt-16 min-w-0 max-w-3xl scroll-mt-24 overflow-x-hidden border-t border-gray-200 pt-12"
      >
        <h2 className="mb-4 text-xl font-semibold text-gray-900">{t(language, 'product.description_title')}</h2>
        <div
          className="product-description-content prose prose-sm max-w-none break-words text-gray-600 [&_img]:max-w-full [&_img]:h-auto [&_pre]:overflow-x-auto"
          dangerouslySetInnerHTML={{
            __html: sanitizeHtml(
              getProductText(language, product.id, 'longDescription') || product.description || '',
            ),
          }}
        />
      </section>

      <div className="mt-16">
        <RelatedProducts
          currentProductSlug={product.slug}
          relatedContext={relatedContext}
        />
      </div>
    </div>
  );
}
