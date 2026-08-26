'use client';

import type { MouseEvent } from 'react';
import { ProductCardImage } from './ProductCardImage';
import { buildProductCardCachePayload } from '../../lib/products/product-card-cache';
import { ProductCardInfo } from './ProductCardInfo';
import { ProductCardActions } from './ProductCardActions';
import { ProductColors } from './ProductColors';
import { InstallmentPriceButton } from './InstallmentPriceButton';
import { CartIcon } from '../icons/CartIcon';
import { ProductLabels } from '../ProductLabels';
import { useTranslation } from '../../lib/i18n-client';
import { formatPrice } from '../../lib/currency';
import { ProductWarrantyBadge } from './ProductWarrantyBadge';
import { getProductCardCategoryLineLabel } from '../../lib/productCardCategoryLabel';
import type { ProductCardGridProps } from './productCardGrid.types';

type ProductCardGridDesktopProps = Omit<
  ProductCardGridProps,
  'stackInstallmentLabel' | 'specialOffersHomeCard'
> & {
  onInstallmentClick: (event: MouseEvent) => void;
};

/**
 * Desktop (lg+) product card — Figma Mobee-Dev-Neew node 91:1312.
 */
export function ProductCardGridDesktop({
  product,
  currency,
  isInWishlist,
  isInCompare,
  isAddingToCart,
  imageError,
  isCompact = false,
  shiftImageInFrame = false,
  squareImageFrame = true,
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
  onInstallmentClick,
}: ProductCardGridDesktopProps) {
  const { t, lang } = useTranslation();
  const categoryLine = getProductCardCategoryLineLabel(product, lang);

  const productHasPrice = product.hasPrice ?? (product.price != null && product.price > 0);
  const listPrice = product.compareAtPrice ?? product.originalPrice ?? null;
  const showStrike =
    productHasPrice &&
    listPrice != null &&
    product.price != null &&
    listPrice > product.price;

  const primaryActionDisabled = addButtonNavigatesToProduct
    ? false
    : !product.inStock || !productHasPrice || isAddingToCart;
  const primaryActionEnabled = addButtonNavigatesToProduct
    ? true
    : product.inStock && productHasPrice && !isAddingToCart;

  const priceClass = 'text-[20px] leading-7';

  const hasColors = Boolean(product.colors && product.colors.length > 0);

  return (
    <div
      className="relative flex h-full min-h-[556px] flex-col overflow-hidden rounded-[23px] border border-[#f3f4f6] bg-white"
      data-product-card-root
    >
      <div className="relative shrink-0 px-[15px] pt-5">
        <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-lg py-8">
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
          {hasColors ? (
            <div className="mt-2 flex w-full justify-center">
              <ProductColors
                colors={product.colors!}
                isCompact={isCompact}
                align="center"
                interactive={colorsInteractive}
                selectedLinkValue={selectedCardLinkColor ?? linkColor}
                onColorSelect={onCardColorSelect}
              />
            </div>
          ) : null}
        </div>

        {product.labels && product.labels.length > 0 ? (
          <ProductLabels labels={product.labels} variant="productCard" />
        ) : null}
        {product.warrantyYears ? (
          <div className="pointer-events-none absolute bottom-3 left-3 z-20">
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
          isCompact={isCompact}
          hidePrice
          hideColors
          listingCacheSource={buildProductCardCachePayload(product)}
          linkColor={linkColor}
        />

        <div className="mt-auto flex flex-col px-[15px] pb-4">
          <div className="mb-3 h-px w-full bg-[#e5e7eb]" aria-hidden />
          <div
            className={`flex items-center justify-between gap-2 ${showStrike ? '' : 'mb-5'}`}
          >
            <div className="flex min-w-0 flex-col justify-center">
              {productHasPrice && product.price != null ? (
                <span className={`whitespace-nowrap font-bold tabular-nums text-[#111827] ${priceClass}`}>
                  {formatPrice(product.price, currency)}
                </span>
              ) : (
                <div className="min-h-7" aria-hidden="true" />
              )}
            </div>
            {productHasPrice ? (
              <InstallmentPriceButton onClick={onInstallmentClick} variant="pill" />
            ) : null}
          </div>

          {showStrike && listPrice != null ? (
            <span className="mb-1 text-base font-medium leading-7 text-[#d0d0d0] line-through">
              {formatPrice(listPrice, currency)}
            </span>
          ) : null}

          <button
            type="button"
            onClick={onAddToCart}
            disabled={primaryActionDisabled}
            className={`inline-flex h-[55px] w-full items-center justify-center gap-2.5 rounded-[40px] bg-[#2db2ff] px-2 text-sm font-medium tracking-[0.2px] text-white transition-opacity ${
              primaryActionEnabled
                ? 'cursor-pointer hover:opacity-90'
                : 'cursor-default opacity-50'
            }`}
            title={product.inStock ? t('common.buttons.addToCart') : t('common.stock.outOfStock')}
            aria-label={
              product.inStock ? t('common.ariaLabels.addToCart') : t('common.ariaLabels.outOfStock')
            }
          >
            {isAddingToCart ? (
              <svg
                className="h-[23px] w-[23px] animate-spin"
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
                <CartIcon className="shrink-0" size={23} />
                <span className="whitespace-nowrap leading-7">{t('common.buttons.addToCart')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
