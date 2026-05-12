'use client';

import Link from 'next/link';
import { Card } from '@shop/ui';
import { useTranslation } from '../../../lib/i18n-client';
import { CHECKOUT_FORM_CARD_RADIUS_CLASS } from '../constants';

export function DeliveryPolicyInfoCard() {
  const { t } = useTranslation();

  return (
    <Card
      className={`p-6 border border-admin-200 bg-admin-50/60 ${CHECKOUT_FORM_CARD_RADIUS_CLASS}`}
    >
      <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium">
        <Link href="/returns" className="text-admin-700 underline hover:text-admin-900">
          {t('checkout.deliveryPolicy.returnsLinkText')}
        </Link>
        <Link href="/delivery" className="text-admin-700 underline hover:text-admin-900">
          {t('checkout.deliveryPolicy.fullTermsLink')}
        </Link>
      </nav>
    </Card>
  );
}
