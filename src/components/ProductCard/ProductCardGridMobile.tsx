'use client';

import type { MouseEvent } from 'react';
import { ProductCardImage } from './ProductCardImage';
import { buildProductCardCachePayload } from '../../lib/products/product-card-cache';
import { ProductCardInfo } from './ProductCardInfo';
import { ProductCardActions } from './ProductCardActions';
import { ProductCardPriceBlock } from './ProductCardPriceBlock';
import { InstallmentPriceButton } from './InstallmentPriceButton';
import { CartIcon } from '../icons/CartIcon';
import { ProductLabels } from '../ProductLabels';
import { useTranslation } from '../../lib/i18n-client';
import { ProductWarrantyBadge } from './ProductWarrantyBadge';
import { getProductCardCategoryLineLabel } from '../../lib/productCardCategoryLabel';
import type { ProductCardGridProps } from './productCardGrid.types';

type ProductCardGridMobileProps = ProductCardGridProps & {
  onInstallmentOpen: (event: MouseEvent) => void;
};

/**
 * Mobile (< lg) product card — pre-redesign layout.
 */
export function ProductCardGridMobile({
  product,
  currency,
  isInWishlist,
  isInCompare,
  isAddingToCart,
  imageError,
  isCompact = false,
  shiftImageInFrame = false,
  squareImageFrame = true,
  smallerFooterPrice = false,
  specialOffersHomeCard: _specialOffersHomeCard = false,
  homeProductGridCard = false,
  imageLoadPriority = false,
  onImageError,
  onWishlistToggle,
  onCompareToggle,
  onAddToCart,
  addButtonNavigatesToProduct = false,
  linkColor = null,
  selectedCardLinkColor = null,
  colorsInteractive = false,
  onCardColorSelect,
  stackInstallmentLabel = false,
  onInstallmentOpen,
}: ProductCardGridMobileProps) {
  const { t, lang } = useTranslation();
  const categoryLine = getProductCardCategoryLineLabel(product, lang);
  const footerPriceClass = (() => {
    if (smallerFooterPrice) {
      return isCompact
        ? 'text-[0.824687578125rem] leading-[1.28284734375rem]'
        : 'text-sm leading-tight';
    }

    return isCompact
      ? 'text-[1.06875rem] leading-[1.6625rem]'
      : 'text-[1.1875rem] leading-[1.6625rem]';
  })();

  const productHasPrice = product.hasPrice ?? (product.price != null && product.price > 0);
  const listPrice = product.compareAtPrice ?? product.originalPrice ?? null;
  const showStrike =
    homeProductGridCard &&
    productHasPrice &&
    listPrice != null &&
    product.price != null &&
    listPrice > product.price;

  const mobileDiscountLabel =
    homeProductGridCard &&
    product.discountPercent != null &&
    product.discountPercent > 0
      ? t('home.mobile_home.discountLabel').replace(
          '{{percent}}',
          String(product.discountPercent),
        )
      : null;

  const primaryActionDisabled = addButtonNavigatesToProduct
    ? false
    : !product.inStock || !productHasPrice || isAddingToCart;
  const primaryActionEnabled = addButtonNavigatesToProduct
    ? true
    : product.inStock && productHasPrice && !isAddingToCart;

  const cardShellClass = homeProductGridCard
    ? 'relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-[#f3f4f6] bg-white'
    : 'relative flex h-full min-h-0 flex-col overflow-hidden rounded-[12px] border border-[#f3f4f6] bg-white';

  const imageStackClass = homeProductGridCard
    ? 'relative min-h-[176px] shrink-0 overflow-hidden'
    : isCompact
      ? 'relative min-h-[240px] shrink-0'
      : 'relative min-h-[277px] shrink-0';

  const imageFrameClass = homeProductGridCard
    ? 'absolute inset-x-2 top-2'
    : 'absolute inset-x-5 top-5';

  const imageMatClass = homeProductGridCard
    ? 'flex h-full w-full items-center justify-center overflow-hidden rounded-[8px] bg-transparent py-2'
    : 'flex h-full w-full items-center justify-center overflow-hidden rounded-[8px] bg-white py-[33px]';

  const footerPad = isCompact || homeProductGridCard ? 'px-3 pb-3' : 'px-5 pb-5';

  const discountClass = smallerFooterPrice
    ? isCompact
      ? 'text-[0.54979171875rem]'
      : 'text-[0.641423671875rem]'
    : isCompact
      ? 'text-[0.7125rem]'
      : 'text-[0.83125rem]';

  const infoPricePad = homeProductGridCard
    ? 'px-3 pb-1.5 pt-1'
    : isCompact
      ? 'px-3 pb-2'
      : 'px-5 pb-3';

  return (
    <div className={cardShellClass} data-product-card-root>
      <div className={imageStackClass}>
        <div className={imageFrameClass}>
          <div className={imageMatClass}>
            <ProductCardImage
              slug={product.slug}
              image={product.image}
              title={product.title}
              imageError={imageError}
              onImageError={onImageError}
              isCompact={isCompact}
              shiftImageInFrame={shiftImageInFrame}
              squareImageFrame={squareImageFrame}
              imageLoadPriority={imageLoadPriority}
              listingCacheSource={buildProductCardCachePayload(product)}
              linkColor={linkColor}
            />
          </div>
        </div>
        {product.labels && product.labels.length > 0 ? (
          <div className="pointer-events-none absolute inset-0 z-20">
            <ProductLabels labels={product.labels} />
          </div>
        ) : null}
        {product.warrantyYears ? (
          <div className="pointer-events-none absolute bottom-2 left-2 z-20">
            <ProductWarrantyBadge years={product.warrantyYears} size="catalog" />
          </div>
        ) : null}
        <ProductCardActions
          isInWishlist={isInWishlist}
          isInCompare={isInCompare}
          isAddingToCart={isAddingToCart}
          inStock={product.inStock}
          isCompact={isCompact}
          onWishlistToggle={onWishlistToggle}
          onCompareToggle={onCompareToggle}
          onAddToCart={onAddToCart}
          cornerOnImage
          homeProductGridCard={homeProductGridCard}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <ProductCardInfo
          slug={product.slug}
          title={product.title}
          categoryLine={categoryLine}
          brandName={product.brand?.name}
          price={product.price}
          discountPercent={product.discountPercent}
          currency={currency}
          colors={product.colors}
          isCompact={isCompact}
          hidePrice
          omitBrandRow={homeProductGridCard}
          titleSizeMobileFigma={homeProductGridCard}
          listingCacheSource={buildProductCardCachePayload(product)}
          linkColor={linkColor}
          selectedCardLinkColor={selectedCardLinkColor}
          colorsInteractive={colorsInteractive}
          onCardColorSelect={onCardColorSelect}
        />
        <div className={`mt-auto ${infoPricePad}`}>
          <ProductCardPriceBlock
            price={product.price}
            hasPrice={productHasPrice}
            currency={currency}
            discountPercent={product.discountPercent}
            listPrice={listPrice}
            priceClass={footerPriceClass}
            discountClass={discountClass}
            homeProductGridCard={homeProductGridCard}
            showStrike={showStrike}
          />
        </div>
      </div>

      <div
        className={`flex shrink-0 flex-col gap-2 pt-2 ${footerPad} ${
          homeProductGridCard ? 'gap-1.5' : ''
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onAddToCart}
            disabled={primaryActionDisabled}
            className={`inline-flex shrink-0 items-center justify-center bg-[#2db2ff] font-medium text-white transition-opacity ${
              primaryActionEnabled
                ? 'cursor-pointer hover:opacity-90'
                : 'cursor-default opacity-50'
            } ${
              homeProductGridCard
                ? 'size-9 min-h-9 min-w-9 gap-0 rounded-full p-0'
                : isCompact
                  ? 'h-10 min-w-[110px] gap-2 rounded-[20px] px-3 text-xs tracking-wide'
                  : 'h-[38.88px] min-w-[106.92px] gap-[6.3px] rounded-[16.2px] px-[12.96px] text-[11.34px] leading-[21.6px] tracking-[0.162px]'
            }`}
            title={product.inStock ? t('common.buttons.addToCart') : t('common.stock.outOfStock')}
            aria-label={
              product.inStock ? t('common.ariaLabels.addToCart') : t('common.ariaLabels.outOfStock')
            }
          >
            {isAddingToCart ? (
              <svg
                className={`animate-spin ${homeProductGridCard || isCompact ? 'h-4 w-4' : 'h-[16.2px] w-[16.2px]'}`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              <>
                <CartIcon
                  className="shrink-0"
                  size={homeProductGridCard || isCompact ? 18 : 16.2}
                />
                <span className={`whitespace-nowrap ${homeProductGridCard ? 'sr-only' : ''}`}>
                  {t('common.buttons.addToCart')}
                </span>
              </>
            )}
          </button>
          {productHasPrice ? (
            <InstallmentPriceButton
              onClick={onInstallmentOpen}
              stackLabel={stackInstallmentLabel}
            />
          ) : null}
        </div>
        {homeProductGridCard && mobileDiscountLabel ? (
          <div className="flex items-center">
            <span className="inline-flex h-[22px] items-center justify-center rounded-full bg-white px-1.5 text-xs font-bold leading-none text-[#ff383c]">
              {mobileDiscountLabel}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
