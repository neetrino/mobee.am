'use client';

import { useTranslation } from '../../../lib/i18n-client';
import { formatPriceInCurrency, convertPrice } from '../../../lib/currency';
import { FREE_SHIPPING_THRESHOLD_AMD } from '../../../lib/constants/checkout-shipping.constants';

interface DeliveryPricingHintProps {
  currency: 'USD' | 'AMD' | 'EUR' | 'RUB' | 'GEL';
  visible: boolean;
}

export function DeliveryPricingHint({ currency, visible }: DeliveryPricingHintProps) {
  const { t } = useTranslation();

  if (!visible) {
    return null;
  }

  const thresholdValue =
    currency === 'AMD' ? FREE_SHIPPING_THRESHOLD_AMD : convertPrice(FREE_SHIPPING_THRESHOLD_AMD, 'AMD', currency);

  const text = t('checkout.summary.deliveryPricingHint').replace(
    '{threshold}',
    formatPriceInCurrency(thresholdValue, currency)
  );

  return <p className="text-xs text-gray-500">{text}</p>;
}
