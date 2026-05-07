'use client';

import { useTranslation } from '../../../lib/i18n-client';
import { formatPriceInCurrency, convertPrice } from '../../../lib/currency';
import {
  FREE_SHIPPING_THRESHOLD_AMD,
  YEREVAN_FALLBACK_SHIPPING_BELOW_THRESHOLD_AMD,
} from '../../../lib/constants/checkout-shipping.constants';

interface DeliveryPricingHintProps {
  currency: 'USD' | 'AMD' | 'EUR' | 'RUB' | 'GEL';
  visible: boolean;
}

/**
 * Explains Yerevan flat rate, free-delivery threshold, and regional pricing in checkout summaries.
 */
export function DeliveryPricingHint({ currency, visible }: DeliveryPricingHintProps) {
  const { t } = useTranslation();

  if (!visible) {
    return null;
  }

  const thresholdValue =
    currency === 'AMD' ? FREE_SHIPPING_THRESHOLD_AMD : convertPrice(FREE_SHIPPING_THRESHOLD_AMD, 'AMD', currency);
  const yerevanFeeValue =
    currency === 'AMD'
      ? YEREVAN_FALLBACK_SHIPPING_BELOW_THRESHOLD_AMD
      : convertPrice(YEREVAN_FALLBACK_SHIPPING_BELOW_THRESHOLD_AMD, 'AMD', currency);

  const text = t('checkout.summary.deliveryPricingHint')
    .replace('{threshold}', formatPriceInCurrency(thresholdValue, currency))
    .replace('{yerevanFee}', formatPriceInCurrency(yerevanFeeValue, currency));

  return <p className="text-xs text-gray-500">{text}</p>;
}
