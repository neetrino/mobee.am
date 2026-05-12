'use client';

import { UseFormRegister } from 'react-hook-form';
import { Card, Button, Input } from '@shop/ui';
import { useTranslation } from '../../lib/i18n-client';
import { formatPriceInCurrency } from '../../lib/currency';
import { ORDER_SUMMARY_SIDEBAR_STICKY_CLASS } from '../../lib/order-summary-sticky.constants';
import {
  CHECKOUT_FORM_CARD_FRAME_MATCH_CART_CLASS,
  CHECKOUT_FORM_CARD_RADIUS_CLASS,
} from './constants';
import { DeliveryPricingHint } from './components/DeliveryPricingHint';
import type { Cart, CheckoutFormData } from './types';

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
  deliverySpeed: 'standard' | 'express';
  shippingCity: string | undefined;
  loadingDeliveryPrice: boolean;
  deliveryPrice: number | null;
  requiresRegionalQuote: boolean;
  error: string | null;
  isSubmitting: boolean;
  register: UseFormRegister<CheckoutFormData>;
  promoCodeError?: string;
  onPlaceOrder: (e?: React.FormEvent) => void;
}

export function OrderSummary({
  cart: _cart,
  orderSummary,
  currency,
  shippingMethod,
  deliverySpeed,
  shippingCity,
  loadingDeliveryPrice,
  deliveryPrice,
  requiresRegionalQuote,
  error,
  isSubmitting,
  register,
  promoCodeError,
  onPlaceOrder,
}: OrderSummaryProps) {
  const { t } = useTranslation();

  const checkoutBlocked = shippingMethod === 'delivery' && requiresRegionalQuote;

  const deliveryTypeSuffix =
    shippingMethod === 'delivery' &&
    deliveryPrice !== null &&
    !requiresRegionalQuote &&
    !loadingDeliveryPrice
      ? deliverySpeed === 'express'
        ? ` · ${t('checkout.summary.shippingExpress')}`
        : ` · ${t('checkout.summary.shippingStandard')}`
      : '';

  const shippingLabel =
    shippingMethod === 'pickup'
      ? t('checkout.shipping.freePickup')
      : loadingDeliveryPrice
        ? t('checkout.shipping.loading')
        : requiresRegionalQuote
          ? t('checkout.summary.regionalQuotePending')
          : deliveryPrice !== null
            ? deliveryPrice === 0
              ? `${t('checkout.shipping.freeDelivery')}${deliveryTypeSuffix}`
              : `${formatPriceInCurrency(orderSummary.shippingDisplay, currency)}${deliveryTypeSuffix}` +
                (shippingCity ? ` (${shippingCity})` : ` (${t('checkout.shipping.delivery')})`)
            : t('checkout.placeholders.selectCity');

  return (
    <div>
      <Card
        className={`p-6 ${CHECKOUT_FORM_CARD_RADIUS_CLASS} ${CHECKOUT_FORM_CARD_FRAME_MATCH_CART_CLASS} ${ORDER_SUMMARY_SIDEBAR_STICKY_CLASS}`}
      >
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('checkout.orderSummary')}</h2>
        <div className="mb-6">
          <Input
            label={t('checkout.form.promoCode')}
            type="text"
            placeholder={t('checkout.placeholders.promoCode')}
            {...register('promoCode')}
            error={promoCodeError}
            disabled={isSubmitting}
          />
        </div>
        <div className="space-y-4 mb-6">
          <div className="flex justify-between text-gray-600">
            <span>{t('checkout.summary.subtotal')}</span>
            <span>{formatPriceInCurrency(orderSummary.subtotalDisplay, currency)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>{t('checkout.summary.shipping')}</span>
            <span className="text-right max-w-[60%]">{shippingLabel}</span>
          </div>
          <DeliveryPricingHint currency={currency} visible={shippingMethod === 'delivery'} />
          <div className="flex justify-between text-gray-600">
            <span>{t('checkout.summary.tax')}</span>
            <span>{formatPriceInCurrency(orderSummary.taxDisplay, currency)}</span>
          </div>
          {orderSummary.totalExcludesPendingShipping && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
              {t('checkout.summary.totalPendingShippingNote')}
            </p>
          )}
        </div>

        <div className="border-t border-gray-200 pt-4 mb-6">
          <div className="flex justify-between text-lg font-bold text-gray-900">
            <span>{t('checkout.summary.total')}</span>
            <span>{formatPriceInCurrency(orderSummary.totalDisplay, currency)}</span>
          </div>
        </div>

        {error && (
          <div
            className={`mb-4 border border-red-200 bg-red-50 p-3 ${CHECKOUT_FORM_CARD_RADIUS_CLASS}`}
          >
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <Button
          type="submit"
          variant="brand"
          className="w-full !rounded-full"
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
