'use client';

import { useTranslation } from '../../../../lib/i18n-client';
import { Card } from '@shop/ui';
import { convertPrice, formatPriceInCurrency, type CurrencyCode } from '../../../../lib/currency';
import type { OrderDetails } from '../useOrders';

interface OrderDetailsTotalsProps {
  orderDetails: OrderDetails;
  currency: string;
  formatCurrency: (amount: number, orderCurrency?: string, fromCurrency?: CurrencyCode) => string;
}

export function OrderDetailsTotals({
  orderDetails,
  currency,
  formatCurrency,
}: OrderDetailsTotalsProps) {
  const { t } = useTranslation();

  if (!orderDetails.totals) {
    return null;
  }

  return (
    <Card className="p-4 md:p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('orders.orderSummary.title')}</h3>
      <div className="space-y-3">
        <div className="flex justify-between text-sm text-gray-700">
          <span>{t('orders.orderSummary.subtotal')}</span>
          <span>{formatCurrency(orderDetails.totals.subtotal, (orderDetails.totals.currency || 'AMD') as CurrencyCode, 'USD')}</span>
        </div>
        {orderDetails.totals.discount > 0 && (
          <div className="flex justify-between text-sm text-gray-700">
            <span>{t('orders.orderSummary.discount')}</span>
            <span>-{formatCurrency(orderDetails.totals.discount, (orderDetails.totals.currency || 'AMD') as CurrencyCode, 'USD')}</span>
          </div>
        )}
        <div className="flex justify-between text-sm text-gray-700">
          <span>{t('orders.orderSummary.shipping')}</span>
          <span>
            {orderDetails.shippingMethod === 'pickup'
              ? t('checkout.shipping.freePickup')
              : formatCurrency(orderDetails.totals.shipping, orderDetails.totals.currency || 'AMD', 'AMD') + (orderDetails.shippingAddress?.city ? ` (${orderDetails.shippingAddress.city})` : '')}
          </span>
        </div>
        <div className="flex justify-between text-sm text-gray-700">
          <span>{t('orders.orderSummary.tax')}</span>
          <span>{formatCurrency(orderDetails.totals.tax, (orderDetails.totals.currency || 'AMD') as CurrencyCode, 'USD')}</span>
        </div>
        <div className="border-t border-gray-200 pt-3 mt-3">
          <div className="flex justify-between text-base font-bold text-gray-900">
            <span>{t('orders.orderSummary.total')}</span>
            <span>
              {(() => {
                const subtotalAMD = convertPrice(orderDetails.totals.subtotal, 'USD', 'AMD');
                const discountAMD = convertPrice(orderDetails.totals.discount, 'USD', 'AMD');
                const shippingAMD = orderDetails.totals.shipping;
                const taxAMD = convertPrice(orderDetails.totals.tax, 'USD', 'AMD');
                const totalAMD = subtotalAMD - discountAMD + shippingAMD + taxAMD;
                const totalDisplay = currency === 'AMD' ? totalAMD : convertPrice(totalAMD, 'AMD', currency as CurrencyCode);
                return formatPriceInCurrency(totalDisplay, currency as CurrencyCode);
              })()}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

