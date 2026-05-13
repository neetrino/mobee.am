'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@shop/ui';
import { formatPrice } from '../../lib/currency';
import type { CurrencyCode } from '../../lib/currency';
import {
  CART_ITEM_ROW_DESKTOP_IMAGE_FRAME_CLASS,
  CART_ITEM_ROW_DESKTOP_IMAGE_MAT_CLASS,
  CART_ITEM_ROW_DESKTOP_IMAGE_STACK_CLASS,
  CART_ITEM_ROW_DESKTOP_MIN_HEIGHT_CLASS,
  CART_LINE_ITEM_CARD_FOOTER_CLASS,
  CART_LINE_ITEM_CARD_FRAME_CLASS,
} from '../cart/constants';
import { DISMISS_ROUND_BUTTON_HOVER_CLASS } from '../../lib/dismiss-icon-button.constants';
import { WISHLIST_SAVED_HEART_ICON_CLASS } from './wishlist.constants';

export interface WishlistItemCardProduct {
  id: string;
  slug: string;
  title: string;
  price: number;
  originalPrice: number | null;
  compareAtPrice: number | null;
  image: string | null;
  inStock: boolean;
  defaultVariantId?: string | null;
  brand: {
    id: string;
    name: string;
  } | null;
}

interface WishlistItemCardProps {
  product: WishlistItemCardProduct;
  currency: string;
  onRemove: (productId: string) => void;
  onAddToCart: (product: WishlistItemCardProduct) => void;
  t: (key: string) => string;
}

export function WishlistItemCard({
  product,
  currency,
  onRemove,
  onAddToCart,
  t,
}: WishlistItemCardProps) {
  const currencyCode = currency as CurrencyCode;
  const listPrice = product.compareAtPrice ?? product.originalPrice;
  const showStrike = listPrice !== null && listPrice > product.price;

  return (
    <div
      className={`${CART_LINE_ITEM_CARD_FRAME_CLASS} ${CART_ITEM_ROW_DESKTOP_MIN_HEIGHT_CLASS}`}
      data-wishlist-product-id={product.id}
    >
      <button
        type="button"
        onClick={() => onRemove(product.id)}
        className={`absolute right-2 top-2 z-10 flex size-8 items-center justify-center rounded-full border border-gray-200 bg-white/95 shadow-md backdrop-blur-sm transition-colors text-gray-500 ${DISMISS_ROUND_BUTTON_HOVER_CLASS}`}
        aria-label={t('common.ariaLabels.removeFromWishlist')}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div
        className={`relative shrink-0 max-lg:min-h-[120px] max-lg:overflow-hidden ${CART_ITEM_ROW_DESKTOP_IMAGE_STACK_CLASS}`}
      >
        <div
          className={`absolute inset-x-2 top-2 bottom-2 max-lg:bottom-2 lg:inset-x-5 lg:top-5 lg:bottom-auto ${CART_ITEM_ROW_DESKTOP_IMAGE_FRAME_CLASS}`}
        >
          <div
            className={`flex h-full w-full items-center justify-center overflow-hidden rounded-[8px] bg-white py-2 ${CART_ITEM_ROW_DESKTOP_IMAGE_MAT_CLASS}`}
          >
            <Link
              href={`/products/${product.slug}`}
              className="relative block h-full min-h-[104px] w-full max-lg:min-h-[104px] lg:min-h-0"
              data-cart-fly-source
            >
              {product.image ? (
                <Image
                  src={product.image}
                  alt={product.title}
                  fill
                  className="object-contain p-2"
                  sizes="(max-width: 833px) 45vw, (max-width: 1279px) 30vw, 22vw"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                  <svg className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              )}
            </Link>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-2 pb-1 pt-2 lg:px-5 lg:pb-1 lg:pt-2">
        <div className="flex gap-1.5 pr-8">
          <svg
            className={`mt-0.5 h-4 w-4 shrink-0 ${WISHLIST_SAVED_HEART_ICON_CLASS}`}
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 21.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <Link
            href={`/products/${product.slug}`}
            className="line-clamp-2 text-sm font-medium leading-snug text-gray-900 transition-colors hover:text-blue-600"
          >
            {product.title}
          </Link>
        </div>
        {product.brand?.name ? (
          <p className="mt-1 line-clamp-1 pl-5 text-[10px] text-gray-500">{product.brand.name}</p>
        ) : null}
      </div>

      <div className={CART_LINE_ITEM_CARD_FOOTER_CLASS}>
        <div className="flex w-full flex-col items-center gap-1">
          <span className="text-center text-sm font-bold tabular-nums text-gray-900">
            {formatPrice(product.price, currencyCode)}
          </span>
          {showStrike && listPrice !== null ? (
            <span className="text-center text-xs tabular-nums text-gray-500 line-through">
              {formatPrice(listPrice, currencyCode)}
            </span>
          ) : null}
        </div>

        <div className="flex w-full flex-col items-center gap-2">
          {!product.inStock ? (
            <span className="text-xs font-medium text-red-600">{t('common.stock.outOfStock')}</span>
          ) : null}
          <Button
            variant="primary"
            type="button"
            onClick={() => onAddToCart(product)}
            disabled={!product.inStock}
            className="w-full !cursor-pointer !rounded-full !bg-admin-500 !text-white hover:!bg-admin-600 focus:!ring-admin-500 disabled:!cursor-default disabled:opacity-50"
            size="md"
          >
            {t('common.buttons.addToCart')}
          </Button>
        </div>
      </div>
    </div>
  );
}
