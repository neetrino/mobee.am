'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Button } from '@shop/ui';
import { formatPrice } from '../../lib/currency';
import type { CurrencyCode } from '../../lib/currency';
import { resolveProductCardImageSrc } from '../../lib/productCardDisplayImage';
import { ProductImagePlaceholder } from '../../components/ProductImagePlaceholder';
import type { Cart, CartItem } from './types';
import {
  CART_ITEM_ROW_DESKTOP_IMAGE_FRAME_CLASS,
  CART_ITEM_ROW_DESKTOP_IMAGE_MAT_CLASS,
  CART_ITEM_ROW_DESKTOP_IMAGE_STACK_CLASS,
  CART_ITEM_ROW_DESKTOP_MIN_HEIGHT_CLASS,
  CART_LINE_ITEM_CARD_FOOTER_CLASS,
  CART_LINE_ITEM_CARD_FRAME_CLASS,
  CART_ORDER_SUMMARY_OUTLINE_CTA_TEXT_CLASS,
  CART_ORDER_SUMMARY_PRIMARY_CTA_TEXT_CLASS,
  ORDER_SUMMARY_PANEL_RADIUS_CLASS,
} from './constants';
import { CART_LINE_ITEMS_GRID_CLASS } from '../../components/home-best-choice.constants';
import { ORDER_SUMMARY_SIDEBAR_STICKY_OUTER_CLASS } from '../../lib/order-summary-sticky.constants';
import { DISMISS_ROUND_BUTTON_HOVER_CLASS } from '../../lib/dismiss-icon-button.constants';
import {
  LAYOUT_DESKTOP_MAX_MOBILE_WIDTH_PX,
  SHOP_LEGACY_DESKTOP_MIN_WIDTH_PX,
} from '../../lib/layout-breakpoints.constants';
import { CartCtaResponsiveLabel } from './cart-cta-responsive-label';

/**
 * Cart item row component
 */
interface CartItemRowProps {
  item: CartItem;
  currency: string;
  updatingItems: Set<string>;
  onRemove: (itemId: string) => void;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  t: (key: string) => string;
}

export function CartItemRow({
  item,
  currency,
  updatingItems,
  onRemove,
  onUpdateQuantity,
  t,
}: CartItemRowProps) {
  const currencyCode = currency as CurrencyCode;
  const [imageError, setImageError] = useState(false);
  const imageSrc = resolveProductCardImageSrc(item.variant.product.image);

  useEffect(() => {
    setImageError(false);
  }, [item.id, imageSrc]);
  const quantityControls = (
    <div className="flex w-full min-w-0 items-center justify-center gap-1.5">
      <button
        type="button"
        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
        disabled={updatingItems.has(item.id)}
        className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-gray-300 bg-white transition-colors hover:bg-gray-50 disabled:cursor-default disabled:opacity-50"
        aria-label={t('common.ariaLabels.decreaseQuantity')}
      >
        <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      </button>
      <input
        type="number"
        min="1"
        max={item.variant.stock !== undefined ? item.variant.stock : undefined}
        value={item.quantity}
        onChange={(e) => {
          const newQuantity = parseInt(e.target.value) || 1;
          onUpdateQuantity(item.id, newQuantity);
        }}
        disabled={updatingItems.has(item.id)}
        className="h-8 min-w-0 w-12 shrink rounded-lg border border-gray-300 bg-white px-1 py-0 text-center text-sm font-medium tabular-nums leading-8 [-moz-appearance:textfield] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        title={item.variant.stock !== undefined ? t('common.messages.availableQuantity').replace('{stock}', item.variant.stock.toString()) : ''}
      />
      <button
        type="button"
        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
        disabled={updatingItems.has(item.id) || (item.variant.stock !== undefined && item.quantity >= item.variant.stock)}
        className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-gray-300 bg-white transition-colors hover:bg-gray-50 disabled:cursor-default disabled:opacity-50"
        aria-label={t('common.ariaLabels.increaseQuantity')}
        title={item.variant.stock !== undefined && item.quantity >= item.variant.stock ? t('common.messages.availableQuantity').replace('{stock}', item.variant.stock.toString()) : t('common.messages.addQuantity')}
      >
        <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );

  const priceBlock = (
    <div className="flex w-full flex-col items-center gap-0.5">
      <span className="text-center text-sm font-bold tabular-nums text-gray-900">
        {formatPrice(item.total, currencyCode)}
      </span>
      {item.originalPrice && item.originalPrice > item.price ? (
        <span className="text-center text-xs tabular-nums text-gray-500 line-through">
          {formatPrice(item.originalPrice * item.quantity, currencyCode)}
        </span>
      ) : null}
    </div>
  );

  return (
    <div
      className={`${CART_LINE_ITEM_CARD_FRAME_CLASS} ${CART_ITEM_ROW_DESKTOP_MIN_HEIGHT_CLASS}`}
    >
      <button
        type="button"
        onClick={() => onRemove(item.id)}
        className={`absolute right-2 top-2 z-10 flex size-8 items-center justify-center rounded-full border border-gray-200 bg-white/95 shadow-md backdrop-blur-sm transition-colors text-gray-500 ${DISMISS_ROUND_BUTTON_HOVER_CLASS}`}
        aria-label={t('common.buttons.remove')}
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
              href={`/products/${item.variant.product.slug}`}
              className="relative block h-full min-h-[104px] w-full max-lg:min-h-[104px] lg:min-h-0"
            >
              {imageError ? (
                <ProductImagePlaceholder
                  className="absolute inset-0"
                  aria-label={
                    item.variant.product.title
                      ? `No image for ${item.variant.product.title}`
                      : 'No image'
                  }
                />
              ) : (
                <Image
                  src={imageSrc}
                  alt={item.variant.product.title}
                  fill
                  className="object-contain p-2"
                  sizes={`(max-width: ${LAYOUT_DESKTOP_MAX_MOBILE_WIDTH_PX}px) 45vw, (max-width: ${SHOP_LEGACY_DESKTOP_MIN_WIDTH_PX - 1}px) 30vw, 22vw`}
                  onError={() => setImageError(true)}
                />
              )}
            </Link>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-2 pb-1 pt-2 lg:px-5 lg:pb-1 lg:pt-2">
        <Link
          href={`/products/${item.variant.product.slug}`}
          className="line-clamp-2 pr-8 text-sm font-medium leading-snug text-gray-900 transition-colors hover:text-blue-600"
        >
          {item.variant.product.title}
        </Link>
        {item.variant.sku ? (
          <p className="mt-1 line-clamp-1 text-[10px] text-gray-500">
            {t('common.messages.sku')}: {item.variant.sku}
          </p>
        ) : null}
      </div>

      <div className={CART_LINE_ITEM_CARD_FOOTER_CLASS}>
        <span className="sr-only">{t('common.messages.subtotal')}</span>
        {priceBlock}
        <div
          className="flex w-full flex-col items-stretch justify-center"
          role="group"
          aria-label={t('common.messages.quantity')}
        >
          <span className="sr-only">{t('common.messages.quantity')}</span>
          {quantityControls}
        </div>
      </div>
    </div>
  );
}

/**
 * Cart table component
 */
interface CartTableProps {
  cart: Cart;
  currency: string;
  updatingItems: Set<string>;
  onRemove: (itemId: string) => void;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  t: (key: string) => string;
}

export function CartTable({
  cart,
  currency,
  updatingItems,
  onRemove,
  onUpdateQuantity,
  t,
}: CartTableProps) {
  return (
    <div className="lg:col-span-2">
      <div className={CART_LINE_ITEMS_GRID_CLASS}>
        {cart.items.map((item) => (
          <CartItemRow
            key={item.id}
            item={item}
            currency={currency}
            updatingItems={updatingItems}
            onRemove={onRemove}
            onUpdateQuantity={onUpdateQuantity}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Order summary component
 */
interface OrderSummaryProps {
  cart: Cart;
  currency: string;
  t: (key: string) => string;
}

export function OrderSummary({ cart, currency, t }: OrderSummaryProps) {
  const currencyCode = currency as CurrencyCode;
  
  return (
    <div className={`lg:col-span-1 ${ORDER_SUMMARY_SIDEBAR_STICKY_OUTER_CLASS}`}>
      <div
        className={`${ORDER_SUMMARY_PANEL_RADIUS_CLASS} border border-gray-200 bg-white p-6`}
      >
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          {t('common.cart.orderSummary')}
        </h2>
        <div className="space-y-4 mb-6">
          <div className="flex justify-between text-gray-600">
            <span>{t('common.cart.subtotal')}</span>
            <span>{formatPrice(cart.totals.subtotal, currencyCode)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>{t('common.cart.shipping')}</span>
            <span>{t('common.cart.free')}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>{t('common.cart.tax')}</span>
            <span>{formatPrice(cart.totals.tax, currencyCode)}</span>
          </div>
          <div className="border-t border-gray-200 pt-4">
            <div className="flex justify-between text-lg font-bold text-gray-900">
              <span>{t('common.cart.total')}</span>
              <span>{formatPrice(cart.totals.total, currencyCode)}</span>
            </div>
          </div>
        </div>
        <Button
          variant="primary"
          className={`w-full !rounded-full !bg-admin-500 !text-white hover:!bg-admin-600 focus:!ring-admin-500 ${CART_ORDER_SUMMARY_PRIMARY_CTA_TEXT_CLASS}`}
          size="lg"
          aria-label={t('common.buttons.proceedToCheckout')}
          onClick={() => {
            // Allow guest checkout - no redirect to login
            window.location.href = '/checkout';
          }}
        >
          <CartCtaResponsiveLabel
            narrowLabel={t('common.cart.narrowProceedToCheckout')}
            fullLabel={t('common.buttons.proceedToCheckout')}
          />
        </Button>
        <Button
          variant="outline"
          className={`mt-3 w-full !rounded-full ${CART_ORDER_SUMMARY_OUTLINE_CTA_TEXT_CLASS}`}
          size="md"
          aria-label={t('common.buttons.browseProducts')}
          onClick={() => {
            window.location.href = '/products';
          }}
        >
          <CartCtaResponsiveLabel
            narrowLabel={t('common.cart.narrowBrowseProducts')}
            fullLabel={t('common.buttons.browseProducts')}
          />
        </Button>
      </div>
    </div>
  );
}

