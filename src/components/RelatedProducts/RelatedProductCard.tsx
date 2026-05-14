'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { MouseEvent, PointerEvent, TouchEvent } from 'react';
import { formatPrice } from '../../lib/currency';
import { CartIcon } from '../icons/CartIcon';
import type { CurrencyCode } from '../../lib/currency';
import type { LanguageCode } from '../../lib/language';
import { t } from '../../lib/i18n';
import { resolveProductCardImageSrc } from '../../lib/productCardDisplayImage';
import { LAYOUT_DESKTOP_MIN_WIDTH_PX } from '../../lib/layout-breakpoints.constants';

interface RelatedProduct {
  id: string;
  slug: string;
  title: string;
  price: number;
  originalPrice?: number | null;
  compareAtPrice: number | null;
  discountPercent?: number | null;
  image: string | null;
  inStock: boolean;
  brand?: {
    id: string;
    name: string;
  } | null;
  categories?: Array<{
    id: string;
    slug: string;
    title: string;
  }>;
}

interface RelatedProductCardProps {
  product: RelatedProduct;
  currency: CurrencyCode;
  language: LanguageCode;
  isAddingToCart: boolean;
  hasMoved: boolean;
  onAddToCart: (e: MouseEvent, product: RelatedProduct) => void;
  onImageError: (productId: string) => void;
  imageError: boolean;
  /** Carousel strip: percentage width. Omit for 2-column grid (fills cell). */
  width?: string;
}

function stopCarouselCapture(
  e: MouseEvent<Element> | PointerEvent<Element> | TouchEvent<Element>,
) {
  e.stopPropagation();
}

/**
 * Single product card component for RelatedProducts carousel
 */
export function RelatedProductCard({
  product,
  currency,
  language,
  isAddingToCart,
  hasMoved,
  onAddToCart,
  onImageError,
  imageError,
  width,
}: RelatedProductCardProps) {
  const isCarouselCell = typeof width === 'string' && width.length > 0;
  const hasImage = !imageError;
  const imageSrc = resolveProductCardImageSrc(product.image);
  const categoryName =
    product.categories && product.categories.length > 0
      ? product.categories.map((c) => c.title).join(', ')
      : product.brand?.name || 'Product';

  const blockNavWhenCarouselDragged = (e: MouseEvent) => {
    if (hasMoved) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const cardShellClass = isCarouselCell
    ? 'h-full flex-shrink-0 px-3'
    : 'h-full min-w-0 w-full';

  return (
    <div className={cardShellClass} style={isCarouselCell ? { width } : undefined}>
      <div
        className="group relative flex h-full flex-col overflow-hidden rounded-lg bg-white shadow-sm transition-shadow hover:shadow-md"
        data-related-product-card
      >
        <Link
          href={`/products/${product.slug}`}
          className="flex min-h-0 flex-1 flex-col outline-none focus-visible:ring-2 focus-visible:ring-[#2db2ff] focus-visible:ring-offset-2"
          onClick={blockNavWhenCarouselDragged}
        >
          <div
            className="relative aspect-square flex-shrink-0 overflow-hidden border-b border-gray-100 bg-white"
            data-cart-fly-source
          >
            {hasImage ? (
              <Image
                src={imageSrc}
                alt={product.title}
                fill
                className="object-contain transition-transform duration-300 group-hover:scale-105"
                sizes={
                  isCarouselCell
                    ? `(max-width: 640px) 100vw, (max-width: ${LAYOUT_DESKTOP_MIN_WIDTH_PX}px) 50vw, 25vw`
                    : `(max-width: ${LAYOUT_DESKTOP_MIN_WIDTH_PX - 1}px) 48vw, 22vw`
                }
                onError={() => onImageError(product.id)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gray-200">
                <span className="text-sm text-gray-400">{t(language, 'common.messages.noImage')}</span>
              </div>
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col p-4">
            <h3 className="mb-1 line-clamp-2 text-sm font-semibold text-gray-900 transition-colors group-hover:text-gray-600">
              {product.title}
            </h3>
            <p className="text-xs text-gray-500">{categoryName}</p>
          </div>
        </Link>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-gray-100 px-4 py-3">
          <Link
            href={`/products/${product.slug}`}
            className="min-w-0 flex flex-wrap items-center gap-2"
            onClick={blockNavWhenCarouselDragged}
          >
            <span className="whitespace-nowrap text-[1.06875rem] font-bold tabular-nums text-gray-900">
              {formatPrice(product.price, currency)}
            </span>
            {product.discountPercent != null && product.discountPercent > 0 ? (
              <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[0.7125rem] font-semibold text-blue-600">
                -{product.discountPercent}%
              </span>
            ) : null}
          </Link>

          <button
            type="button"
            onPointerDown={stopCarouselCapture}
            onMouseDown={stopCarouselCapture}
            onTouchStart={stopCarouselCapture}
            onClick={(e) => onAddToCart(e, product)}
            disabled={!product.inStock || isAddingToCart}
            className={`relative z-10 inline-flex size-10 shrink-0 items-center justify-center rounded-full font-medium text-white transition-opacity ${
              product.inStock && !isAddingToCart
                ? 'cursor-pointer bg-[#2db2ff] hover:opacity-90'
                : 'cursor-default bg-[#2db2ff] opacity-50'
            }`}
            title={
              product.inStock
                ? t(language, 'common.buttons.addToCart')
                : t(language, 'common.stock.outOfStock')
            }
            aria-label={
              product.inStock
                ? t(language, 'common.ariaLabels.addToCart')
                : t(language, 'common.ariaLabels.outOfStock')
            }
          >
            {isAddingToCart ? (
              <svg
                className="h-5 w-5 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              <CartIcon className="shrink-0" size={20} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
