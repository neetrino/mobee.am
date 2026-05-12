'use client';

import { UseFormRegister } from 'react-hook-form';
import { Input } from '@shop/ui';
import { useTranslation } from '../../../lib/i18n-client';
import { formatPriceInCurrency } from '../../../lib/currency';
import { CHECKOUT_FORM_CARD_RADIUS_CLASS } from '../constants';
import { DeliveryPricingHint } from './DeliveryPricingHint';
import type { Cart, CheckoutFormData } from '../types';

interface OrderSummaryModalProps {
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
  shippingCity?: string;
  loadingDeliveryPrice: boolean;
  deliveryPrice: number | null;
  requiresRegionalQuote: boolean;
  register: UseFormRegister<CheckoutFormData>;
  promoCodeError?: string;
  isSubmitting: boolean;
}

export function OrderSummaryModal({
  cart,
  orderSummary,
  currency,
  shippingMethod,
  deliverySpeed,
  shippingCity,
  loadingDeliveryPrice,
  deliveryPrice,
  requiresRegionalQuote,
  register,
  promoCodeError,
  isSubmitting,
}: OrderSummaryModalProps) {
  const { t } = useTranslation();

  if (!cart) {
    return null;
  }

  const deliveryTypeSuffix =
    shippingMethod === 'delivery' &&
    deliveryPrice !== null &&
    !requiresRegionalQuote &&
    !loadingDeliveryPrice
      ? deliverySpeed === 'express'
        ? ` · ${t('checkout.summary.shippingExpress')}`
        : ` · ${t('checkout.summary.shippingStandard')}`
      : '';

  const shippingDisplay =
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
    <div className={`space-y-2 bg-gray-50 p-4 ${CHECKOUT_FORM_CARD_RADIUS_CLASS}`}>
      <div className="mb-3">
        <Input
          label={t('checkout.form.promoCode')}
          type="text"
          placeholder={t('checkout.placeholders.promoCode')}
          {...register('promoCode')}
          error={promoCodeError}
          disabled={isSubmitting}
        />
      </div>
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
        <span className="font-medium text-right max-w-[55%]">{shippingDisplay}</span>
      </div>
      <DeliveryPricingHint currency={currency} visible={shippingMethod === 'delivery'} />
      {orderSummary.totalExcludesPendingShipping && (
        <p className="text-xs text-amber-800">{t('checkout.summary.totalPendingShippingNote')}</p>
      )}
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
