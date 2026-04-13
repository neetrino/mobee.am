'use client';

import { useTranslation } from '../../../../lib/i18n-client';
import { Card } from '@shop/ui';
import { convertPrice, formatPriceInCurrency, type CurrencyCode } from '../../../../lib/currency';
import type { OrderDetails } from '../useOrders';

interface OrderDetailsSummaryProps {
  orderDetails: OrderDetails;
  currency: string;
  formatCurrency: (amount: number, orderCurrency?: string, fromCurrency?: CurrencyCode) => string;
}

export function OrderDetailsSummary({
  orderDetails,
  currency,
  formatCurrency,
}: OrderDetailsSummaryProps) {
  const { t } = useTranslation();

  return (
    <Card className="p-4 md:p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">{t('admin.orders.orderDetails.summary')}</h3>
          <div className="text-sm text-gray-700 space-y-1">
            <div>
              <span className="font-medium">{t('admin.orders.orderDetails.orderNumber')}</span> {orderDetails.number}
            </div>
            <div>
              <span className="font-medium">{t('admin.orders.orderDetails.total')}</span>{' '}
              {orderDetails.totals ? (() => {
                const subtotalAMD = convertPrice(orderDetails.totals.subtotal, 'USD', 'AMD');
                const discountAMD = convertPrice(orderDetails.totals.discount, 'USD', 'AMD');
                const shippingAMD = orderDetails.totals.shipping;
                const taxAMD = convertPrice(orderDetails.totals.tax, 'USD', 'AMD');
                const totalAMD = subtotalAMD - discountAMD + shippingAMD + taxAMD;
                const totalDisplay = currency === 'AMD' ? totalAMD : convertPrice(totalAMD, 'AMD', currency as CurrencyCode);
                return formatPriceInCurrency(totalDisplay, currency as CurrencyCode);
              })() : formatCurrency(orderDetails.total, (orderDetails.currency || 'AMD') as CurrencyCode, 'USD')}
            </div>
            <div>
              <span className="font-medium">{t('admin.orders.orderDetails.status')}</span> {orderDetails.status}
            </div>
            <div>
              <span className="font-medium">{t('admin.orders.orderDetails.payment')}</span> {orderDetails.paymentStatus}
            </div>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">{t('admin.orders.orderDetails.customer')}</h3>
          <div className="text-sm text-gray-700 space-y-1">
            <div>
              {(orderDetails.customer?.firstName || '') +
                (orderDetails.customer?.lastName ? ' ' + orderDetails.customer.lastName : '') ||
                t('admin.orders.unknownCustomer')}
            </div>
            {orderDetails.customerPhone && <div>{orderDetails.customerPhone}</div>}
            {orderDetails.customerEmail && <div>{orderDetails.customerEmail}</div>}
          </div>
        </div>
      </div>
    </Card>
  );
}

