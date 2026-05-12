'use client';

import { useTranslation } from '../../../../lib/i18n-client';
import { Card } from '@/app/admin/lib/adminShopUi';
import { CurrencyCode } from '../../../../lib/currency';
import type { OrderDetails } from '../useOrders';

interface OrderDetailsAddressesProps {
  orderDetails: OrderDetails;
  formatCurrency: (amount: number, orderCurrency?: string, fromCurrency?: CurrencyCode) => string;
}

export function OrderDetailsAddresses({ orderDetails, formatCurrency }: OrderDetailsAddressesProps) {
  const { t } = useTranslation();

  const deliverySpeed = orderDetails.shippingAddress?.deliverySpeed as
    | 'standard'
    | 'express'
    | undefined;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="p-4 md:p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">{t('admin.orders.orderDetails.shippingAddress')}</h3>
        {orderDetails.shippingMethod === 'pickup' ? (
          <div className="text-sm text-gray-700 space-y-1">
            <div>
              <span className="font-medium">{t('admin.orders.orderDetails.shippingMethod')}</span>{' '}
              {t('admin.orders.orderDetails.pickup')}
            </div>
          </div>
        ) : orderDetails.shippingMethod === 'delivery' && orderDetails.shippingAddress ? (
          <div className="text-sm text-gray-700 space-y-1">
            <div className="mb-2 flex items-center gap-2 flex-wrap">
              <span className="font-medium">{t('admin.orders.orderDetails.shippingMethod')}</span>{' '}
              <span
                className={
                  deliverySpeed === 'express'
                    ? 'inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-800'
                    : 'inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-800'
                }
              >
                {deliverySpeed === 'express' ? 'Express' : 'Standard'}
              </span>
            </div>
            {(orderDetails.shippingAddress.address || orderDetails.shippingAddress.addressLine1) && (
              <div>
                <span className="font-medium">{t('checkout.form.address')}:</span>{' '}
                {orderDetails.shippingAddress.address || orderDetails.shippingAddress.addressLine1}
                {orderDetails.shippingAddress.addressLine2 && `, ${orderDetails.shippingAddress.addressLine2}`}
              </div>
            )}
            {orderDetails.shippingAddress.city && (
              <div>
                <span className="font-medium">{t('checkout.form.city')}:</span> {orderDetails.shippingAddress.city}
              </div>
            )}
            {orderDetails.shippingAddress.postalCode && (
              <div>
                <span className="font-medium">{t('checkout.form.postalCode')}:</span> {orderDetails.shippingAddress.postalCode}
              </div>
            )}
            {(orderDetails.shippingAddress.phone || orderDetails.shippingAddress.shippingPhone) && (
              <div className="mt-2">
                <span className="font-medium">{t('checkout.form.phoneNumber')}:</span>{' '}
                {orderDetails.shippingAddress.phone || orderDetails.shippingAddress.shippingPhone}
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-gray-500">
            <p>{t('admin.orders.orderDetails.noShippingAddress')}</p>
            {orderDetails.shippingMethod && (
              <p>
                {t('admin.orders.orderDetails.shippingMethod')}{' '}
                {orderDetails.shippingMethod === 'pickup'
                  ? t('admin.orders.orderDetails.pickup')
                  : orderDetails.shippingMethod === 'delivery'
                  ? deliverySpeed === 'express'
                    ? 'Express'
                    : 'Standard'
                  : orderDetails.shippingMethod}
              </p>
            )}
          </div>
        )}
      </Card>
      <Card className="p-4 md:p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">{t('admin.orders.orderDetails.paymentInfo')}</h3>
        {orderDetails.payment ? (
          <div className="text-sm text-gray-700 space-y-1">
            {orderDetails.payment.method && <div>{t('admin.orders.orderDetails.method')} {orderDetails.payment.method}</div>}
            <div>
              {t('admin.orders.orderDetails.amount')}{' '}
              {formatCurrency(orderDetails.payment.amount, orderDetails.payment.currency || 'AMD', 'AMD')}
            </div>
            <div>{t('admin.orders.orderDetails.status')} {orderDetails.payment.status}</div>
            {orderDetails.payment.cardBrand && orderDetails.payment.cardLast4 && (
              <div>
                {t('admin.orders.orderDetails.card')} {orderDetails.payment.cardBrand} ••••{orderDetails.payment.cardLast4}
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-gray-500">{t('admin.orders.orderDetails.noPaymentInfo')}</div>
        )}
      </Card>
    </div>
  );
}


