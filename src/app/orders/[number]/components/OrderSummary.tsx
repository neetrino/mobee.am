'use client';

import Link from 'next/link';
import { Card, Button } from '@shop/ui';
import { useTranslation } from '../../../../lib/i18n-client';
import { formatPriceInCurrency, convertPrice } from '../../../../lib/currency';
import type { Order } from '../types';

interface OrderSummaryProps {
  order: Order;
  currency: 'USD' | 'AMD' | 'EUR' | 'RUB' | 'GEL';
  calculatedShipping: number | null;
  loadingShipping: boolean;
}

export function OrderSummary({
  order,
  currency,
  calculatedShipping,
  loadingShipping,
}: OrderSummaryProps) {
  const { t } = useTranslation();

  const subtotalDisplay = (() => {
    const subtotalAMD = convertPrice(order.totals.subtotal, 'USD', 'AMD');
    return currency === 'AMD' ? subtotalAMD : convertPrice(subtotalAMD, 'AMD', currency);
  })();

  const discountDisplay = order.totals.discount > 0 ? (() => {
    const discountAMD = convertPrice(order.totals.discount, 'USD', 'AMD');
    return currency === 'AMD' ? discountAMD : convertPrice(discountAMD, 'AMD', currency);
  })() : null;

  const shippingDisplay = order.shippingMethod === 'pickup' 
    ? t('checkout.shipping.freePickup')
    : loadingShipping
      ? t('checkout.shipping.loading')
      : (() => {
          const shippingAMD = calculatedShipping !== null ? calculatedShipping : order.totals.shipping;
          const shippingDisplayValue = currency === 'AMD' 
            ? shippingAMD 
            : convertPrice(shippingAMD, 'AMD', currency);
          return formatPriceInCurrency(shippingDisplayValue, currency) + 
            (order.shippingAddress?.city ? ` (${order.shippingAddress.city})` : '');
        })();

  const taxDisplay = (() => {
    const taxAMD = convertPrice(order.totals.tax, 'USD', 'AMD');
    return currency === 'AMD' ? taxAMD : convertPrice(taxAMD, 'AMD', currency);
  })();

  const totalDisplay = (() => {
    const subtotalAMD = convertPrice(order.totals.subtotal, 'USD', 'AMD');
    const discountAMD = convertPrice(order.totals.discount, 'USD', 'AMD');
    const shippingAMD = calculatedShipping !== null ? calculatedShipping : order.totals.shipping;
    const taxAMD = convertPrice(order.totals.tax, 'USD', 'AMD');
    const totalAMD = subtotalAMD - discountAMD + shippingAMD + taxAMD;
    return currency === 'AMD' ? totalAMD : convertPrice(totalAMD, 'AMD', currency);
  })();

  return (
    <Card className="p-6 sticky top-4">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('orders.orderSummary.title')}</h2>
      <div className="space-y-4 mb-6">
        {order.totals ? (
          <>
            <div className="flex justify-between text-gray-600">
              <span>{t('orders.orderSummary.subtotal')}</span>
              <span>{formatPriceInCurrency(subtotalDisplay, currency)}</span>
            </div>
            {order.totals.discount > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>{t('orders.orderSummary.discount')}</span>
                <span>-{formatPriceInCurrency(discountDisplay!, currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>{t('orders.orderSummary.shipping')}</span>
              <span>{shippingDisplay}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>{t('orders.orderSummary.tax')}</span>
              <span>{formatPriceInCurrency(taxDisplay, currency)}</span>
            </div>
            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between text-lg font-bold text-gray-900">
                <span>{t('orders.orderSummary.total')}</span>
                <span>{formatPriceInCurrency(totalDisplay, currency)}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="text-gray-600">{t('orders.orderSummary.loadingTotals')}</div>
        )}
      </div>

      <div className="space-y-3">
        <Link href="/products">
          <Button variant="primary" className="w-full">
            {t('orders.buttons.continueShopping')}
          </Button>
        </Link>
        <Link href="/cart">
          <Button variant="ghost" className="w-full">
            {t('orders.buttons.viewCart')}
          </Button>
        </Link>
      </div>
    </Card>
  );
}




