'use client';

import type { MouseEvent } from 'react';
import { ProductCardImage } from './ProductCardImage';
import { ProductCardInfo } from './ProductCardInfo';
import { ProductCardActions } from './ProductCardActions';
import { CartIcon as CartPngIcon } from '../icons/CartIcon';
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
  onImageError,
  onWishlistToggle,
  onCompareToggle,
  onAddToCart,
}: ProductCardGridProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow relative">
      {/* Product image: square inset + white panel + centered asset (object-contain for clear silhouette) */}
      <div className="aspect-square relative">
        <div className="absolute inset-0 p-5">
          <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-lg bg-white py-8">
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
      <div
        className={`flex items-center justify-between gap-3 border-t border-gray-50 pt-[17px] ${isCompact ? 'px-3 pb-3' : 'px-5 pb-5'}`}
      >
        <div className="min-w-0 flex flex-col">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`font-bold tabular-nums text-gray-900 ${isCompact ? 'text-lg leading-7' : 'text-xl leading-7'}`}
            >
              {formatPrice(product.price || 0, currency)}
            </span>
            {product.discountPercent && product.discountPercent > 0 ? (
              <span className={`font-semibold text-blue-600 ${isCompact ? 'text-xs' : 'text-sm'}`}>
                -{product.discountPercent}%
              </span>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={onAddToCart}
          disabled={!product.inStock || isAddingToCart}
          className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-[20px] bg-[#2db2ff] font-medium text-white transition-opacity ${
            product.inStock && !isAddingToCart
              ? 'hover:opacity-90'
              : 'cursor-not-allowed opacity-50'
          } ${isCompact ? 'h-10 min-w-[110px] px-3 text-xs tracking-wide' : 'h-12 min-w-[132px] px-4 text-sm tracking-[0.2px]'}`}
          title={product.inStock ? t('common.buttons.addToCart') : t('common.stock.outOfStock')}
          aria-label={product.inStock ? t('common.ariaLabels.addToCart') : t('common.ariaLabels.outOfStock')}
        >
          {isAddingToCart ? (
            <svg
              className={`animate-spin ${isCompact ? 'h-4 w-4' : 'h-5 w-5'}`}
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
              <CartPngIcon size={isCompact ? 18 : 20} />
              <span className="whitespace-nowrap">{t('common.buttons.addToCart')}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

