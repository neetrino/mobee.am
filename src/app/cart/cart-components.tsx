'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@shop/ui';
import { formatPrice } from '../../lib/currency';
import type { CurrencyCode } from '../../lib/currency';
import type { Cart, CartItem } from './types';

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
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 px-4 sm:px-6 py-6 hover:bg-gray-50 transition-colors relative"
    >
      <button
        onClick={() => onRemove(item.id)}
        className="absolute top-2 right-2 md:top-4 md:right-4 w-7 h-7 rounded-full bg-white hover:bg-red-50 flex items-center justify-center text-gray-500 hover:text-red-600 transition-colors shadow-md border border-gray-200 hover:border-red-300 z-10"
        aria-label={t('common.buttons.remove')}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      
      {/* Product */}
      <div className="md:col-span-6 flex items-start gap-4">
        <Link
          href={`/products/${item.variant.product.slug}`}
          className="w-24 h-24 sm:w-28 sm:h-28 bg-gray-100 rounded-lg flex-shrink-0 relative overflow-hidden"
        >
          {item.variant.product.image ? (
            <Image
              src={item.variant.product.image}
              alt={item.variant.product.title}
              fill
              className="object-cover"
              sizes="80px"
              unoptimized
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <Link
            href={`/products/${item.variant.product.slug}`}
            className="text-base font-medium text-gray-900 hover:text-blue-600 transition-colors line-clamp-2"
          >
            {item.variant.product.title}
          </Link>
          {item.variant.sku && (
            <p className="text-xs text-gray-500 mt-1">{t('common.messages.sku')}: {item.variant.sku}</p>
          )}
        </div>
      </div>

      {/* Quantity */}
      <div className="md:col-span-2 flex flex-col items-start md:items-center justify-center">
        <p className="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase md:hidden">
          {t('common.messages.quantity')}
        </p>
        <div className="flex items-center justify-center gap-2 w-full md:w-auto">
          <button
            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
            disabled={updatingItems.has(item.id)}
            className="w-9 h-9 flex-shrink-0 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={t('common.ariaLabels.decreaseQuantity')}
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            className="w-20 h-9 text-right border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 font-medium pl-2 pr-5"
            title={item.variant.stock !== undefined ? t('common.messages.availableQuantity').replace('{stock}', item.variant.stock.toString()) : ''}
          />
          <button
            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
            disabled={updatingItems.has(item.id) || (item.variant.stock !== undefined && item.quantity >= item.variant.stock)}
            className="w-9 h-9 flex-shrink-0 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={t('common.ariaLabels.increaseQuantity')}
            title={item.variant.stock !== undefined && item.quantity >= item.variant.stock ? t('common.messages.availableQuantity').replace('{stock}', item.variant.stock.toString()) : t('common.messages.addQuantity')}
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Subtotal */}
      <div className="md:col-span-3 flex flex-col md:flex-row md:items-center md:justify-start md:ml-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 md:hidden">
          {t('common.messages.subtotal')}
        </p>
        <div className="flex flex-col gap-1 mt-1 md:mt-0">
          <span className="text-lg font-semibold text-blue-600">
            {formatPrice(item.total, currencyCode)}
          </span>
          {item.originalPrice && item.originalPrice > item.price && (
            <span className="text-sm text-gray-500 line-through">
              {formatPrice(item.originalPrice * item.quantity, currencyCode)}
            </span>
          )}
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
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Table Header */}
        <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="md:col-span-6">
            <span className="text-sm font-semibold text-gray-900 uppercase tracking-wide">{t('common.messages.product')}</span>
          </div>
          <div className="md:col-span-2 text-center">
            <span className="text-sm font-semibold text-gray-900 uppercase tracking-wide">{t('common.messages.quantity')}</span>
          </div>
          <div className="md:col-span-3 text-center">
            <span className="text-sm font-semibold text-gray-900 uppercase tracking-wide">{t('common.messages.subtotal')}</span>
          </div>
          <div className="md:col-span-1"></div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-gray-200">
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
    <div className="lg:col-span-1">
      <div className="bg-white rounded-lg border border-gray-200 p-6 lg:sticky lg:top-24">
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
          className="w-full" 
          size="lg"
          onClick={() => {
            // Allow guest checkout - no redirect to login
            window.location.href = '/checkout';
          }}
        >
          {t('common.buttons.proceedToCheckout')}
        </Button>
        <Button
          variant="outline"
          className="w-full mt-3"
          size="md"
          onClick={() => {
            window.location.href = '/products';
          }}
        >
          {t('common.buttons.browseProducts')}
        </Button>
      </div>
    </div>
  );
}

