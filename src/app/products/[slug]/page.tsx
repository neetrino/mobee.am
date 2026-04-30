'use client';

import { apiClient } from '../../../lib/api-client';
import { t, getProductText } from '../../../lib/i18n';
import { sanitizeHtml } from '../../../lib/utils/sanitize';
import { useAuth } from '../../../lib/auth/AuthContext';
import { RelatedProducts } from '../../../components/RelatedProducts';
import { ProductReviews } from '../../../components/ProductReviews';
import { ProductImageGallery } from './ProductImageGallery';
import { ProductInfoAndActions } from './ProductInfoAndActions';
import { useProductPage } from './useProductPage';
import type { ProductPageProps } from './types';
import { dispatchCartFlyAnimation } from '@/lib/cart/dispatchCartFlyAnimation';
import { PRODUCT_CARD_DISPLAY_IMAGE_SRC } from '@/lib/productCardDisplayImage';
import { upsertGuestCartItem } from '@/lib/cart/guest-cart';

export default function ProductPage({ params }: ProductPageProps) {
  const { isLoggedIn } = useAuth();

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
  } = useProductPage(params);

  const handleAddToCart = async () => {
    if (!canAddToCart || !product || !currentVariant) return;
    setIsAddingToCart(true);
    try {
      if (!isLoggedIn) {
        upsertGuestCartItem({
          productId: product.id,
          productSlug: product.slug,
          variantId: currentVariant.id,
          quantity,
        });
      } else {
        await apiClient.post('/api/v1/cart/items', { productId: product.id, variantId: currentVariant.id, quantity });
      }
      setShowMessage(`${t(language, 'product.addedToCart')} ${quantity} ${t(language, 'product.pcs')}`);
      window.dispatchEvent(new Event('cart-updated'));
      const flyEl = document.querySelector<HTMLElement>('[data-pdp-cart-fly-source]');
      const slideSrc = images[currentImageIndex];
      const flyUrl =
        typeof slideSrc === 'string' && slideSrc.length > 0 ? slideSrc : PRODUCT_CARD_DISPLAY_IMAGE_SRC;
      dispatchCartFlyAnimation(flyUrl, flyEl);
    } catch (err) { 
      setShowMessage(t(language, 'product.errorAddingToCart')); 
    } finally { 
      setIsAddingToCart(false); 
      setTimeout(() => setShowMessage(null), 2000); 
    }
  };

  if (loading || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        {t(language, 'common.messages.loading')}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-[55%_45%] gap-12 items-start">
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
            averageRating={averageRating}
            reviewsCount={reviews.length}
            quantity={quantity}
            maxQuantity={maxQuantity}
            isOutOfStock={isOutOfStock}
            isVariationRequired={isVariationRequired}
            hasUnavailableAttributes={hasUnavailableAttributes}
            unavailableAttributes={unavailableAttributes}
            canAddToCart={canAddToCart}
            isAddingToCart={isAddingToCart}
            isInWishlist={isInWishlist}
            isInCompare={isInCompare}
            showMessage={showMessage}
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
            onScrollToReviews={scrollToReviews}
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
        className="mt-16 max-w-3xl scroll-mt-24 border-t border-gray-200 pt-12"
      >
        <h2 className="mb-4 text-xl font-semibold text-gray-900">{t(language, 'product.description_title')}</h2>
        <div
          className="prose prose-sm max-w-none text-gray-600"
          dangerouslySetInnerHTML={{
            __html: sanitizeHtml(
              getProductText(language, product.id, 'longDescription') || product.description || ''
            ),
          }}
        />
      </section>

      <div id="product-reviews" className="mt-24 scroll-mt-24">
        <ProductReviews productSlug={slug} productId={product.id} />
      </div>
      <div className="mt-16">
        <RelatedProducts currentProductSlug={product.slug} />
      </div>
    </div>
  );
}
