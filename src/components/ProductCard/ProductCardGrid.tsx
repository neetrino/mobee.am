'use client';

import { useState } from 'react';
import type { MouseEvent } from 'react';
import { ProductCardImage } from './ProductCardImage';
import { ProductCardInfo } from './ProductCardInfo';
import { ProductCardActions } from './ProductCardActions';
import { ProductCardPriceBlock } from './ProductCardPriceBlock';
import { InstallmentPriceButton } from './InstallmentPriceButton';
import { InstallmentRequestModal } from './InstallmentRequestModal';
import { ProductCardAddToCartButton } from './ProductCardAddToCartButton';
import { ProductLabels } from '../ProductLabels';
import { useTranslation } from '../../lib/i18n-client';
import type { CurrencyCode } from '../../lib/currency';
import type { ProductLabel } from '../ProductLabels';
import { getProductCardCategoryLineLabel } from '../../lib/productCardCategoryLabel';
import {
  MOBILE_HOME_CARD_ADD_BUTTON_SIZE_CLASS,
  MOBILE_HOME_CARD_FOOTER_ACTIONS_MIN_HEIGHT_CLASS,
  MOBILE_HOME_CARD_FOOTER_GAP_CLASS,
  MOBILE_HOME_CARD_INSTALLMENT_HEIGHT_CLASS,
  MOBILE_HOME_CARD_PRICE_ROW_MIN_HEIGHT_CLASS,
} from './product-card-mobile-home.constants';

interface ProductCardGridProps {
  product: {
    id: string;
    slug: string;
    title: string;
    primaryCategoryId?: string | null;
    categories?: Array<{ id: string; slug?: string; title?: string }>;
    price: number;
    image: string | null;
    inStock: boolean;
    brand: { id: string; name: string } | null;
    labels?: ProductLabel[];
    compareAtPrice?: number | null;
    originalPrice?: number | null;
    discountPercent?: number | null;
    colors?: Array<{ value: string; imageUrl?: string | null; colors?: string[] | null }>;
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
}: ProductCardGridProps) {
  const { t } = useTranslation();
  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
  const categoryLine = getProductCardCategoryLineLabel(product);
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

  const listPrice = product.compareAtPrice ?? product.originalPrice ?? null;
  const showStrike =
    homeProductGridCard &&
    listPrice != null &&
    listPrice > (product.price || 0);

  const mobileDiscountLabel =
    homeProductGridCard &&
    product.discountPercent != null &&
    product.discountPercent > 0
      ? t('home.mobile_home.discountLabel').replace(
          '{{percent}}',
          String(product.discountPercent),
        )
      : null;

  const cardShellClass = homeProductGridCard
    ? 'relative flex h-full min-h-0 flex-col overflow-hidden rounded-[12px] border border-[#f3f4f6] bg-[#f6f6f6] transition-shadow hover:shadow-md max-lg:rounded-2xl max-lg:border-0 max-lg:bg-[#f2f2f7] max-lg:py-2.5 max-lg:hover:shadow-none lg:min-h-[583px]'
    : 'relative flex h-full min-h-0 flex-col overflow-hidden rounded-[12px] border border-[#f3f4f6] bg-[#f6f6f6] transition-shadow hover:shadow-md lg:min-h-[583px]';

  /** Mobile Figma 1:3459 — compact image band with overlaid controls. */
  const imageStackClass = homeProductGridCard
    ? 'relative shrink-0 max-lg:h-[100px] max-lg:min-h-[100px] max-lg:overflow-hidden lg:h-[380px]'
    : isCompact
      ? 'relative shrink-0 max-lg:min-h-[240px] lg:h-[380px]'
      : 'relative shrink-0 max-lg:min-h-[277px] lg:h-[380px]';

  const imageFrameClass = homeProductGridCard
    ? 'absolute inset-x-0 top-0 flex h-[93px] items-center justify-center max-lg:inset-x-0 max-lg:top-0 lg:inset-x-5 lg:top-5 lg:h-[320px]'
    : 'absolute inset-x-5 top-5 lg:h-[320px]';

  const imageMatClass = homeProductGridCard
    ? 'flex h-full w-full items-center justify-center overflow-hidden rounded-[8px] bg-white py-[33px] max-lg:bg-transparent max-lg:py-0 lg:py-[33px]'
    : 'flex h-full w-full items-center justify-center overflow-hidden rounded-[8px] bg-white py-[33px]';

  const footerPad = homeProductGridCard
    ? isCompact
      ? 'px-3 pb-3 max-lg:px-3 max-lg:pb-3 max-lg:pt-1'
      : 'px-3 pb-3 max-lg:px-3 max-lg:pb-3 max-lg:pt-1 lg:px-5 lg:pb-5 lg:pt-[17px]'
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
    ? 'hidden px-3 pb-2 lg:block lg:px-5 lg:pb-3'
    : isCompact
      ? 'px-3 pb-2'
      : 'px-5 pb-3';

  const mobileHomePriceClass =
    'text-sm font-extrabold leading-normal text-[#303030] max-lg:text-sm max-lg:font-extrabold';

  const handleInstallmentClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsInstallmentModalOpen(true);
  };

  const addToCartLabel = product.inStock
    ? t('common.buttons.addToCart')
    : t('common.stock.outOfStock');
  const addToCartAria = product.inStock
    ? t('common.ariaLabels.addToCart')
    : t('common.ariaLabels.outOfStock');

  return (
    <div className={cardShellClass} data-product-card-root>
      <div className={imageStackClass}>
        {mobileDiscountLabel ? (
          <div className="pointer-events-none absolute left-1 top-2 z-30 max-lg:block lg:hidden">
            <span className="inline-flex h-[22px] items-center justify-center rounded-full bg-white px-1.5 text-xs font-bold leading-none text-[#ff383c]">
              {mobileDiscountLabel}
            </span>
          </div>
        ) : null}
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
              homeProductGridCard={homeProductGridCard}
            />
          </div>
        </div>
        {product.labels && product.labels.length > 0 ? (
          <div className="pointer-events-none absolute inset-0 z-20">
            <ProductLabels labels={product.labels} />
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
          homeProductGridCard={homeProductGridCard}
        />
        <div className={infoPricePad}>
          <ProductCardPriceBlock
            price={product.price}
            currency={currency}
            discountPercent={product.discountPercent}
            listPrice={listPrice}
            priceClass={footerPriceClass}
            discountClass={discountClass}
            homeProductGridCard={homeProductGridCard}
            showStrike={showStrike}
          />
        </div>
        <div className="min-h-0 flex-1" aria-hidden />
      </div>

      <div
        className={`mt-auto shrink-0 flex flex-col gap-2 border-t border-[#e5e5e5] pt-[17px] max-lg:border-0 max-lg:pt-0 ${footerPad} ${
          homeProductGridCard ? 'max-lg:gap-0' : ''
        }`}
      >
        {homeProductGridCard ? (
          <div
            className={`flex w-full flex-col max-lg:flex lg:hidden ${MOBILE_HOME_CARD_FOOTER_GAP_CLASS} ${MOBILE_HOME_CARD_FOOTER_ACTIONS_MIN_HEIGHT_CLASS} max-lg:justify-end`}
          >
            <div
              className={`flex w-full items-start justify-between gap-2 ${MOBILE_HOME_CARD_PRICE_ROW_MIN_HEIGHT_CLASS}`}
            >
              <ProductCardPriceBlock
                price={product.price}
                currency={currency}
                discountPercent={product.discountPercent}
                listPrice={listPrice}
                priceClass={mobileHomePriceClass}
                discountClass={discountClass}
                homeProductGridCard={homeProductGridCard}
                showStrike={showStrike}
                reserveMobileStrikeRow
                className="min-w-0 flex-1"
              />
              <div className={MOBILE_HOME_CARD_ADD_BUTTON_SIZE_CLASS}>
                <ProductCardAddToCartButton
                  layout="mobileRound"
                  inStock={product.inStock}
                  isAddingToCart={isAddingToCart}
                  isCompact={isCompact}
                  title={addToCartLabel}
                  ariaLabel={addToCartAria}
                  addToCartLabel={t('common.buttons.addToCart')}
                  onAddToCart={onAddToCart}
                />
              </div>
            </div>
            <InstallmentPriceButton
              onClick={handleInstallmentClick}
              variant="homeMobilePill"
              className={`w-full ${MOBILE_HOME_CARD_INSTALLMENT_HEIGHT_CLASS}`}
            />
          </div>
        ) : null}
        <div
          className={`flex items-center justify-between gap-2 ${
            homeProductGridCard ? 'max-lg:hidden' : ''
          }`}
        >
          <ProductCardAddToCartButton
            layout="desktopPill"
            inStock={product.inStock}
            isAddingToCart={isAddingToCart}
            isCompact={isCompact}
            title={addToCartLabel}
            ariaLabel={addToCartAria}
            addToCartLabel={t('common.buttons.addToCart')}
            onAddToCart={onAddToCart}
          />
          <InstallmentPriceButton onClick={handleInstallmentClick} />
        </div>
      </div>

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
    </div>
  );
}
