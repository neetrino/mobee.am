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
      </div>
    </Card>
  );
}




