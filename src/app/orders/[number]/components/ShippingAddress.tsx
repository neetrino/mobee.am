'use client';

import { useTranslation } from '../../../../lib/i18n-client';
import { ORDER_PAGE_CARD_CLASS, ORDER_PAGE_CARD_TITLE_CLASS } from '../constants';
import type { Order } from '../types';

interface ShippingAddressProps {
  shippingAddress: Order['shippingAddress'];
}

function resolveCountryLabel(countryCode: string | undefined): string {
  if (!countryCode) {
    return '';
  }
  if (countryCode === 'AM' || countryCode.toLowerCase() === 'armenia') {
    return 'Armenia';
  }
  return countryCode;
}

export function ShippingAddress({ shippingAddress }: ShippingAddressProps) {
  const { t } = useTranslation();

  if (!shippingAddress) {
    return null;
  }

  const street =
    shippingAddress.addressLine1?.trim() ||
    (shippingAddress as { address?: string }).address?.trim() ||
    '';
  const region = shippingAddress.city?.trim() ?? '';
  const country = resolveCountryLabel(shippingAddress.countryCode);
  const phone =
    shippingAddress.phone?.trim() ||
    (shippingAddress as { shippingPhone?: string }).shippingPhone?.trim() ||
    '';

  return (
    <section className={ORDER_PAGE_CARD_CLASS}>
      <h2 className={`${ORDER_PAGE_CARD_TITLE_CLASS} mb-4`}>{t('orders.shippingAddress.title')}</h2>
      <div className="space-y-1 text-gray-600">
        {shippingAddress.firstName && shippingAddress.lastName ? (
          <p className="font-medium text-gray-900">
            {shippingAddress.firstName} {shippingAddress.lastName}
          </p>
        ) : null}
        {country ? <p>{t('orders.shippingAddress.country').replace('{value}', country)}</p> : null}
        {region ? <p>{t('orders.shippingAddress.region').replace('{value}', region)}</p> : null}
        {street ? <p>{street}</p> : null}
        {shippingAddress.addressLine2 ? <p>{shippingAddress.addressLine2}</p> : null}
        {shippingAddress.postalCode ? <p>{shippingAddress.postalCode}</p> : null}
        {phone ? <p>{t('orders.shippingAddress.phone').replace('{phone}', phone)}</p> : null}
      </div>
    </section>
  );
}
