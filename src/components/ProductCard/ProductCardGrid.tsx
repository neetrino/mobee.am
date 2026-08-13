'use client';

import { useState } from 'react';
import type { MouseEvent } from 'react';
import { ProductCardImage } from './ProductCardImage';
import { buildProductCardCachePayload } from '../../lib/products/product-card-cache';
import { ProductCardInfo } from './ProductCardInfo';
import { ProductCardActions } from './ProductCardActions';
import { ProductCardPriceBlock } from './ProductCardPriceBlock';
import { InstallmentPriceButton } from './InstallmentPriceButton';
import { InstallmentRequestModal } from './InstallmentRequestModal';
import { CartIcon } from '../icons/CartIcon';
import { ProductLabels } from '../ProductLabels';
import { useTranslation } from '../../lib/i18n-client';
import type { CurrencyCode } from '../../lib/currency';
import type { ProductLabel } from '../ProductLabels';
import type { ProductWarrantyYears } from '../../lib/constants/product-warranty';
import { ProductWarrantyBadge } from './ProductWarrantyBadge';
import { getProductCardCategoryLineLabel } from '../../lib/productCardCategoryLabel';

interface ProductCardGridProps {
  product: {
    id: string;
    slug: string;
    title: string;
    primaryCategoryId?: string | null;
    categories?: Array<{ id: string; slug?: string; title?: string }>;
    price: number | null;
    hasPrice?: boolean;
    image: string | null;
    inStock: boolean;
    brand: { id: string; name: string } | null;
    labels?: ProductLabel[];
    compareAtPrice?: number | null;
    originalPrice?: number | null;
    discountPercent?: number | null;
    warrantyYears?: ProductWarrantyYears | null;
    colors?: Array<{ value: string; linkValue?: string; imageUrl?: string | null; colors?: string[] | null }>;
  };
  currency: CurrencyCode;
  isInWishlist: boolean;
  isInCompare: boolean;
  isAddingToCart: boolean;
  imageError: boolean;
  isCompact?: boolean;
  shiftImageInFrame?: boolean;
  squareImageFrame?: boolean;
  /** Smaller footer price (home “best choice”; ~23% under default grid-2). */
  smallerFooterPrice?: boolean;
  /** Home special-offers cards — desktop add-to-cart pill matches design grid. */
  specialOffersHomeCard?: boolean;
  /** Home curated grids — mobile Figma card (grouped background, compact footer). */
  homeProductGridCard?: boolean;
  /** Eager image for first viewport rows (LCP). */
  imageLoadPriority?: boolean;
  onImageError: () => void;
  onWishlistToggle: (e: MouseEvent) => void;
  onCompareToggle: (e: MouseEvent) => void;
  onAddToCart: (e: MouseEvent) => void;
  addButtonNavigatesToProduct?: boolean;
  linkColor?: string | null;
  selectedCardLinkColor?: string | null;
  colorsInteractive?: boolean;
  onCardColorSelect?: (color: { value: string; linkValue?: string; imageUrl?: string | null; colors?: string[] | null }) => void;
  /** Stack installment CTA label on two lines. */
  stackInstallmentLabel?: boolean;
}

/**
 * Grid view layout for ProductCard
 */
export function ProductCardGrid({
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
}: ProductCardGridProps) {
  const { t, lang } = useTranslation();
  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
  const categoryLine = getProductCardCategoryLineLabel(product, lang);
  const footerPriceClass = (() => {
    if (smallerFooterPrice) {
      return isCompact
        ? 'text-[0.824687578125rem] leading-[1.28284734375rem] lg:text-[1.06875rem] lg:leading-[1.6625rem]'
        : 'text-[0.91631953125rem] leading-[1.28284734375rem] max-lg:text-sm max-lg:leading-tight lg:text-[1.1875rem] lg:leading-[1.6625rem]';
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
    ? 'relative flex h-full min-h-0 flex-col overflow-hidden rounded-[12px] border border-[#f3f4f6] bg-[#f6f6f6] max-lg:rounded-2xl max-lg:border-0 max-lg:bg-[#f2f2f7] lg:min-h-[583px]'
    : 'relative flex h-full min-h-0 flex-col overflow-hidden rounded-[12px] border border-[#f3f4f6] bg-[#f6f6f6] lg:min-h-[583px]';

  /** Mobile: reserve in-flow height so absolutely positioned image/actions do not overlap the title. */
  const imageStackClass = homeProductGridCard
    ? 'relative shrink-0 max-lg:min-h-[176px] max-lg:overflow-hidden lg:h-[380px]'
    : isCompact
      ? 'relative shrink-0 max-lg:min-h-[240px] lg:h-[380px]'
      : 'relative shrink-0 max-lg:min-h-[277px] lg:h-[380px]';

  const imageFrameClass = homeProductGridCard
    ? 'absolute inset-x-2 top-2 max-lg:inset-x-2 max-lg:top-2 lg:inset-x-5 lg:top-5 lg:h-[320px]'
    : 'absolute inset-x-5 top-5 lg:h-[320px]';

  const imageMatClass = homeProductGridCard
    ? 'flex h-full w-full items-center justify-center overflow-hidden rounded-[8px] bg-white py-[33px] max-lg:bg-transparent max-lg:py-2'
    : 'flex h-full w-full items-center justify-center overflow-hidden rounded-[8px] bg-white py-[33px]';

  const footerPad = homeProductGridCard
    ? isCompact
      ? 'px-3 pb-3'
      : 'px-3 pb-3 max-lg:px-3 max-lg:pb-3 lg:px-5 lg:pb-5'
    : isCompact
      ? 'px-3 pb-3'
      : 'px-5 pb-5';

  const discountClass = smallerFooterPrice
    ? isCompact
      ? 'text-[0.54979171875rem] lg:text-[0.7125rem]'
      : 'text-[0.641423671875rem] lg:text-[0.83125rem]'
    : isCompact
      ? 'text-[0.7125rem]'
      : 'text-[0.83125rem]';

  const infoPricePad = homeProductGridCard
    ? 'px-3 pb-2 max-lg:pb-1.5 max-lg:pt-1 lg:px-5 lg:pb-3'
    : isCompact
      ? 'px-3 pb-2'
      : 'px-5 pb-3';

  const handleInstallmentClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsInstallmentModalOpen(true);
  };

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
          <div className="pointer-events-none absolute bottom-3 left-3 z-20 max-lg:bottom-2 max-lg:left-2">
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
        className={`shrink-0 flex flex-col gap-2 border-t border-[#e5e5e5] pt-[17px] max-lg:border-0 max-lg:pt-2 ${footerPad} ${
          homeProductGridCard ? 'max-lg:gap-1.5' : ''
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
                ? isCompact
                  ? 'max-lg:size-9 max-lg:min-h-9 max-lg:min-w-9 max-lg:gap-0 max-lg:rounded-full max-lg:p-0 lg:h-10 lg:min-w-[110px] lg:gap-2 lg:rounded-[20px] lg:px-3 lg:text-xs lg:tracking-wide'
                  : 'max-lg:size-9 max-lg:min-h-9 max-lg:min-w-9 max-lg:gap-0 max-lg:rounded-full max-lg:p-0 lg:h-[38.88px] lg:min-w-[106.92px] lg:gap-[6.3px] lg:rounded-[16.2px] lg:px-[12.96px] lg:text-[11.34px] lg:leading-[21.6px] lg:tracking-[0.162px]'
                : isCompact
                  ? 'h-10 min-w-[110px] gap-2 rounded-[20px] px-3 text-xs tracking-wide'
                  : 'h-[38.88px] min-w-[106.92px] gap-[6.3px] rounded-[16.2px] px-[12.96px] text-[11.34px] leading-[21.6px] tracking-[0.162px]'
            }`}
            title={product.inStock ? t('common.buttons.addToCart') : t('common.stock.outOfStock')}
            aria-label={product.inStock ? t('common.ariaLabels.addToCart') : t('common.ariaLabels.outOfStock')}
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
                <span
                  className={`whitespace-nowrap ${homeProductGridCard ? 'max-lg:sr-only' : ''}`}
                >
                  {t('common.buttons.addToCart')}
                </span>
              </>
            )}
          </button>
          {productHasPrice ? (
            <InstallmentPriceButton
              onClick={handleInstallmentClick}
              stackLabel={stackInstallmentLabel}
            />
          ) : null}
        </div>
        {homeProductGridCard && mobileDiscountLabel ? (
          <div className="hidden max-lg:flex max-lg:items-center">
            <span className="inline-flex h-[22px] items-center justify-center rounded-full bg-white px-1.5 text-xs font-bold leading-none text-[#ff383c]">
              {mobileDiscountLabel}
            </span>
          </div>
        ) : null}
      </div>

      {productHasPrice && product.price != null ? (
      <InstallmentRequestModal
        isOpen={isInstallmentModalOpen}
        onClose={() => setIsInstallmentModalOpen(false)}
        productId={product.id}
        productSlug={product.slug}
        productTitle={product.title}
        productPrice={product.price}
        currency="AMD"
        productImageUrl={product.image}
      />
      ) : null}
    </div>
  );
}
