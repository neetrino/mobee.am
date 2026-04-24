'use client';

import type { MouseEvent } from 'react';
import { ProductCardImage } from './ProductCardImage';
import { ProductCardInfo } from './ProductCardInfo';
import { ProductCardActions } from './ProductCardActions';
import { CartIcon } from '../icons/CartIcon';
import { ProductLabels } from '../ProductLabels';
import { useTranslation } from '../../lib/i18n-client';
import { formatPrice, type CurrencyCode } from '../../lib/currency';
import type { ProductLabel } from '../ProductLabels';

interface ProductCardGridProps {
  product: {
    id: string;
    slug: string;
    title: string;
    subtitle?: string | null;
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
  onImageError,
  onWishlistToggle,
  onCompareToggle,
  onAddToCart,
}: ProductCardGridProps) {
  const { t, lang } = useTranslation();
  /** Russian “Добавить в корзину” needs a slightly tighter pill on desktop (lg). */
  const ruDesktopAddToCart = lang === 'ru';

  return (
    <div className="relative overflow-hidden rounded-[12px] border border-[#f3f4f6] bg-[#f6f6f6] transition-shadow hover:shadow-md lg:min-h-[583px]">
      {/* Figma desktop card geometry: 302x545 with top visual block at 299px */}
      <div className="relative lg:h-[380px]">
        <div className="absolute inset-x-5 top-5 lg:h-[320px]">
          <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-[8px] bg-white py-[33px]">
            <ProductCardImage
              slug={product.slug}
              image={product.image}
              title={product.title}
              imageError={imageError}
              onImageError={onImageError}
              isCompact={isCompact}
              shiftImageInFrame={shiftImageInFrame}
              squareImageFrame={squareImageFrame}
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
        />
      </div>
      
      {/* Product Info */}
      <ProductCardInfo
        slug={product.slug}
        title={product.title}
        subtitle={product.subtitle}
        brandName={product.brand?.name}
        price={product.price}
        discountPercent={product.discountPercent}
        currency={currency}
        colors={product.colors}
        isCompact={isCompact}
        hidePrice
      />

      {/* Figma mobee-new 53:684 — price left, pill CTA right, top divider */}
      <div className={`flex items-center justify-between gap-3 border-t border-[#e5e5e5] pt-[17px] ${isCompact ? 'px-3 pb-3' : 'px-5 pb-5'}`}>
        <div className="min-w-0 flex flex-col">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`font-bold tabular-nums text-gray-900 ${
                smallerFooterPrice
                  ? isCompact
                    ? 'text-[0.824687578125rem] leading-[1.28284734375rem]'
                    : 'text-[0.91631953125rem] leading-[1.28284734375rem]'
                  : isCompact
                    ? 'text-[1.06875rem] leading-[1.6625rem]'
                    : 'text-[1.1875rem] leading-[1.6625rem]'
              }`}
            >
              {formatPrice(product.price || 0, currency)}
            </span>
            {product.discountPercent && product.discountPercent > 0 ? (
              <span
                className={`font-semibold text-blue-600 ${
                  smallerFooterPrice
                    ? isCompact
                      ? 'text-[0.54979171875rem]'
                      : 'text-[0.641423671875rem]'
                    : isCompact
                      ? 'text-[0.7125rem]'
                      : 'text-[0.83125rem]'
                }`}
              >
                -{product.discountPercent}%
              </span>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={onAddToCart}
          disabled={!product.inStock || isAddingToCart}
          className={`inline-flex shrink-0 items-center justify-center bg-[#2db2ff] font-medium text-white transition-opacity ${
            product.inStock && !isAddingToCart
              ? 'hover:opacity-90'
              : 'cursor-not-allowed opacity-50'
          } ${
            isCompact
              ? `h-10 min-w-[110px] gap-2 rounded-[20px] px-3 text-xs tracking-wide${
                  ruDesktopAddToCart
                    ? ' lg:h-[38px] lg:min-w-[104.5px] lg:gap-[7.6px] lg:rounded-[19px] lg:px-[11.4px] lg:text-[11.4px]'
                    : ''
                }`
              : `h-[38.88px] min-w-[106.92px] gap-[6.3px] rounded-[16.2px] px-[12.96px] text-[11.34px] leading-[21.6px] tracking-[0.162px]${
                  ruDesktopAddToCart
                    ? ' lg:h-[36.94px] lg:min-w-[101.57px] lg:gap-[5.99px] lg:rounded-[15.39px] lg:px-[12.31px] lg:text-[10.77px] lg:leading-[20.52px] lg:tracking-[0.154px]'
                    : ''
                }`
          }`}
          title={product.inStock ? t('common.buttons.addToCart') : t('common.stock.outOfStock')}
          aria-label={product.inStock ? t('common.ariaLabels.addToCart') : t('common.ariaLabels.outOfStock')}
        >
          {isAddingToCart ? (
            <svg
              className={`animate-spin ${isCompact ? 'h-4 w-4' : 'h-[16.2px] w-[16.2px]'}${
                ruDesktopAddToCart
                  ? isCompact
                    ? ' lg:h-[15.2px] lg:w-[15.2px]'
                    : ' lg:h-[15.39px] lg:w-[15.39px]'
                  : ''
              }`}
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
              {ruDesktopAddToCart ? (
                <>
                  <CartIcon className="shrink-0 lg:hidden" size={isCompact ? 18 : 16.2} />
                  <CartIcon
                    className="hidden shrink-0 lg:block"
                    size={isCompact ? 17.1 : 15.39}
                  />
                </>
              ) : (
                <CartIcon className="shrink-0" size={isCompact ? 18 : 16.2} />
              )}
              <span className="whitespace-nowrap">{t('common.buttons.addToCart')}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

