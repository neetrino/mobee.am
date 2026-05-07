'use client';

import Link from 'next/link';
import { Card } from '@shop/ui';
import { useTranslation } from '../../../lib/i18n-client';

export function DeliveryPolicyInfoCard() {
  const { t } = useTranslation();

  return (
    <Card className="p-6 border border-purple-100 bg-purple-50/40">
      <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium">
        <Link href="/returns" className="text-purple-700 underline hover:text-purple-900">
          {t('checkout.deliveryPolicy.returnsLinkText')}
        </Link>
        <Link href="/delivery" className="text-purple-700 underline hover:text-purple-900">
          {t('checkout.deliveryPolicy.fullTermsLink')}
        </Link>
      </nav>
    </Card>
  );
}
