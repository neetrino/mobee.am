'use client';

import { Card, Button } from '@shop/ui';
import { useTranslation } from '../../lib/i18n-client';
import { formatPriceInCurrency } from '../../lib/currency';
import type { Cart } from './types';

interface OrderSummaryProps {
  cart: Cart | null;
  orderSummary: {
    subtotalDisplay: number;
    taxDisplay: number;
    shippingDisplay: number;
    totalDisplay: number;
    totalExcludesPendingShipping: boolean;
  };
  currency: 'USD' | 'AMD' | 'EUR' | 'RUB' | 'GEL';
  shippingMethod: 'pickup' | 'delivery';
  shippingCity: string | undefined;
  loadingDeliveryPrice: boolean;
  deliveryPrice: number | null;
  requiresRegionalQuote: boolean;
  error: string | null;
  isSubmitting: boolean;
  onPlaceOrder: (e?: React.FormEvent) => void;
}

export function OrderSummary({
  cart: _cart,
  orderSummary,
  currency,
  shippingMethod,
  shippingCity,
  loadingDeliveryPrice,
  deliveryPrice,
  requiresRegionalQuote,
  error,
  isSubmitting,
  onPlaceOrder,
}: OrderSummaryProps) {
  const { t } = useTranslation();

  const checkoutBlocked = shippingMethod === 'delivery' && requiresRegionalQuote;

  const shippingLabel =
    shippingMethod === 'pickup'
      ? t('checkout.shipping.freePickup')
      : loadingDeliveryPrice
        ? t('checkout.shipping.loading')
        : requiresRegionalQuote
          ? t('checkout.summary.regionalQuotePending')
          : deliveryPrice !== null
            ? deliveryPrice === 0
              ? t('checkout.shipping.freeDelivery')
              : formatPriceInCurrency(orderSummary.shippingDisplay, currency) +
                (shippingCity ? ` (${shippingCity})` : ` (${t('checkout.shipping.delivery')})`)
            : t('checkout.shipping.enterCity');

  return (
    <div>
      <Card className="p-6 sticky top-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('checkout.orderSummary')}</h2>
        <div className="space-y-4 mb-6">
          <div className="flex justify-between text-gray-600">
            <span>{t('checkout.summary.subtotal')}</span>
            <span>{formatPriceInCurrency(orderSummary.subtotalDisplay, currency)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>{t('checkout.summary.shipping')}</span>
            <span className="text-right max-w-[60%]">{shippingLabel}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>{t('checkout.summary.tax')}</span>
            <span>{formatPriceInCurrency(orderSummary.taxDisplay, currency)}</span>
          </div>
          {orderSummary.totalExcludesPendingShipping && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
              {t('checkout.summary.totalPendingShippingNote')}
            </p>
          )}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex justify-between text-lg font-bold text-gray-900">
              <span>{t('checkout.summary.total')}</span>
              <span>{formatPriceInCurrency(orderSummary.totalDisplay, currency)}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <Button
          type="submit"
          variant="brand"
          className="w-full"
          size="lg"
          disabled={isSubmitting || checkoutBlocked}
          onClick={onPlaceOrder}
        >
          {isSubmitting ? t('checkout.buttons.processing') : t('checkout.buttons.placeOrder')}
        </Button>
      </Card>
    </div>
  );
}
