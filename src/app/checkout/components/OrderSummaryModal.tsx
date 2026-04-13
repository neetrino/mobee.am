'use client';

import { useTranslation } from '../../../lib/i18n-client';
import { formatPriceInCurrency } from '../../../lib/currency';
import { Cart } from '../types';

interface OrderSummaryModalProps {
  cart: Cart | null;
  orderSummary: {
    subtotalDisplay: number;
    taxDisplay: number;
    shippingDisplay: number;
    totalDisplay: number;
  };
  currency: 'USD' | 'AMD' | 'EUR' | 'RUB' | 'GEL';
  shippingMethod: 'pickup' | 'delivery';
  shippingCity?: string;
  loadingDeliveryPrice: boolean;
  deliveryPrice: number | null;
}

export function OrderSummaryModal({
  cart,
  orderSummary,
  currency,
  shippingMethod,
  shippingCity,
  loadingDeliveryPrice,
  deliveryPrice,
}: OrderSummaryModalProps) {
  const { t } = useTranslation();

  if (!cart) {
    return null;
  }

  const shippingDisplay = shippingMethod === 'pickup' 
    ? t('checkout.shipping.freePickup')
    : loadingDeliveryPrice
      ? t('checkout.shipping.loading')
      : deliveryPrice !== null
        ? formatPriceInCurrency(orderSummary.shippingDisplay, currency) + 
          (shippingCity ? ` (${shippingCity})` : ` (${t('checkout.shipping.delivery')})`)
        : t('checkout.shipping.enterCity');

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{t('checkout.summary.items')}:</span>
        <span className="font-medium">{cart.itemsCount}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{t('checkout.summary.subtotal')}:</span>
        <span className="font-medium">{formatPriceInCurrency(orderSummary.subtotalDisplay, currency)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{t('checkout.summary.shipping')}:</span>
        <span className="font-medium">{shippingDisplay}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{t('checkout.summary.tax')}:</span>
        <span className="font-medium">{formatPriceInCurrency(orderSummary.taxDisplay, currency)}</span>
      </div>
      <div className="border-t border-gray-200 pt-2 mt-2">
        <div className="flex justify-between">
          <span className="font-semibold text-gray-900">{t('checkout.summary.total')}:</span>
          <span className="font-bold text-gray-900">
            {formatPriceInCurrency(orderSummary.totalDisplay, currency)}
          </span>
        </div>
      </div>
    </div>
  );
}

