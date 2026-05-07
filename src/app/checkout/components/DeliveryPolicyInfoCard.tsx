'use client';

import Link from 'next/link';
import { Card } from '@shop/ui';
import { useTranslation } from '../../../lib/i18n-client';

export function DeliveryPolicyInfoCard() {
  const { t } = useTranslation();

  return (
    <Card className="p-6 border border-purple-100 bg-purple-50/40">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {t('checkout.deliveryPolicy.title')}
      </h3>
      <p className="text-sm text-gray-700 mb-4">{t('checkout.deliveryPolicy.lead')}</p>
      <ul className="space-y-4 text-sm text-gray-700">
        <li>
          <span className="font-medium text-gray-900">{t('checkout.deliveryPolicy.timeframesTitle')}</span>
          <p className="mt-1">{t('checkout.deliveryPolicy.timeframesBody')}</p>
        </li>
        <li>
          <span className="font-medium text-gray-900">{t('checkout.deliveryPolicy.optionsTitle')}</span>
          <ul className="mt-1 list-disc list-inside space-y-1">
            <li>{t('checkout.deliveryPolicy.optionStandard')}</li>
            <li>{t('checkout.deliveryPolicy.optionExpress')}</li>
            <li>{t('checkout.deliveryPolicy.optionPickup')}</li>
          </ul>
        </li>
        <li>
          <span className="font-medium text-gray-900">{t('checkout.deliveryPolicy.feesTitle')}</span>
          <ul className="mt-1 list-disc list-inside space-y-1">
            <li>{t('checkout.deliveryPolicy.feesFreeAbove')}</li>
            <li>{t('checkout.deliveryPolicy.feesYerevanBelow')}</li>
            <li>{t('checkout.deliveryPolicy.feesRegions')}</li>
          </ul>
        </li>
        <li>
          <span className="font-medium text-gray-900">{t('checkout.deliveryPolicy.confirmationTitle')}</span>
          <p className="mt-1">{t('checkout.deliveryPolicy.confirmationBody')}</p>
        </li>
        <li>
          <span className="font-medium text-gray-900">{t('checkout.deliveryPolicy.inspectionTitle')}</span>
          <p className="mt-1">{t('checkout.deliveryPolicy.inspectionItems')}</p>
        </li>
        <li>
          <span className="font-medium text-gray-900">{t('checkout.deliveryPolicy.delaysTitle')}</span>
          <p className="mt-1">{t('checkout.deliveryPolicy.delaysBody')}</p>
        </li>
        <li>
          <p>{t('checkout.deliveryPolicy.specialNote')}</p>
        </li>
      </ul>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <Link href="/returns" className="text-purple-700 underline hover:text-purple-900">
          {t('checkout.deliveryPolicy.returnsLinkText')}
        </Link>
        <Link href="/delivery" className="text-purple-700 underline hover:text-purple-900">
          {t('checkout.deliveryPolicy.fullTermsLink')}
        </Link>
      </div>
    </Card>
  );
}
