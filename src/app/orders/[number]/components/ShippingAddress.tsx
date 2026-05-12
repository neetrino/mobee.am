'use client';

import { Card } from '@shop/ui';
import { useTranslation } from '../../../../lib/i18n-client';
import type { Order } from '../types';

interface ShippingAddressProps {
  shippingAddress: Order['shippingAddress'];
}

export function ShippingAddress({ shippingAddress }: ShippingAddressProps) {
  const { t } = useTranslation();

  if (!shippingAddress) {
    return null;
  }

  const deliverySpeed = shippingAddress.deliverySpeed;
  const deliveryTypeLabel =
    deliverySpeed === 'express'
      ? t('orders.shippingAddress.deliveryTypeExpress')
      : deliverySpeed === 'standard'
        ? t('orders.shippingAddress.deliveryTypeStandard')
        : null;

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('orders.shippingAddress.title')}</h2>
      <div className="text-gray-600">
        {shippingAddress.firstName && shippingAddress.lastName && (
          <p>{shippingAddress.firstName} {shippingAddress.lastName}</p>
        )}
        {shippingAddress.addressLine1 && <p>{shippingAddress.addressLine1}</p>}
        {shippingAddress.addressLine2 && <p>{shippingAddress.addressLine2}</p>}
        {shippingAddress.city && (
          <p>
            {shippingAddress.city}
            {shippingAddress.postalCode && `, ${shippingAddress.postalCode}`}
          </p>
        )}
        {shippingAddress.countryCode && <p>{shippingAddress.countryCode}</p>}
        {shippingAddress.phone && (
          <p className="mt-2">
            {t('orders.shippingAddress.phone').replace('{phone}', shippingAddress.phone)}
          </p>
        )}
        {deliveryTypeLabel && (
          <p className="mt-3 flex items-center gap-2">
            <span className="font-medium text-gray-900">
              {t('orders.shippingAddress.deliveryType')}:
            </span>
            <span
              className={
                deliverySpeed === 'express'
                  ? 'inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-800'
                  : 'inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-800'
              }
            >
              {deliveryTypeLabel}
            </span>
          </p>
        )}
      </div>
    </Card>
  );
}




