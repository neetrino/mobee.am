'use client';

import { Card } from '@shop/ui';
import { useTranslation } from '../../lib/i18n-client';

const DELIVERY_TERM_SECTIONS = [
  'deliveryTimeframes',
  'deliveryOptions',
  'deliveryFees',
  'orderConfirmation',
  'productInspection',
  'possibleDelays',
  'specialNote',
] as const;

const DELIVERY_TERM_LISTS = {
  deliveryOptions: ['standard', 'express', 'pickup'],
  deliveryFees: ['freeThreshold', 'yerevanFee', 'regionalFee'],
  productInspection: ['packaging', 'appearance', 'model', 'completeSet', 'serialNumber'],
  possibleDelays: ['weather', 'transport', 'holidays', 'availability', 'address'],
} as const;

type DeliveryTermSection = (typeof DELIVERY_TERM_SECTIONS)[number];
type DeliveryTermListSection = keyof typeof DELIVERY_TERM_LISTS;

const hasListItems = (section: DeliveryTermSection): section is DeliveryTermListSection => {
  return section in DELIVERY_TERM_LISTS;
};

/**
 * Delivery Terms page - describes shipping and delivery conditions
 */
export default function DeliveryTermsPage() {
  const { t } = useTranslation();

  return (
    <div className="policy-page">
      <div className="policy-page-inner">
        <h1 className="text-4xl font-bold text-gray-900">{t('delivery-terms.title')}</h1>
        <p className="text-gray-600">
          {t('delivery-terms.lastUpdated')}{' '}
          {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>

        <div className="mt-8 space-y-6">
          <Card className="p-6">
            <p className="text-gray-600">{t('delivery-terms.intro')}</p>

            <div className="mt-6 space-y-6">
              {DELIVERY_TERM_SECTIONS.map((section, index) => (
                <section key={section} className="space-y-3">
                  <h2 className="text-2xl font-semibold text-gray-900">
                    {index + 1}. {t(`delivery-terms.sections.${section}.title`)}
                  </h2>
                  <p className="text-gray-600">{t(`delivery-terms.sections.${section}.description`)}</p>

                  {section === 'deliveryTimeframes' ? (
                    <>
                      <p className="text-gray-600">{t('delivery-terms.sections.deliveryTimeframes.typical')}</p>
                      <p className="text-gray-600">{t('delivery-terms.sections.deliveryTimeframes.delayNotice')}</p>
                    </>
                  ) : null}

                  {hasListItems(section) ? (
                    <ul className="list-disc list-inside text-gray-600 ml-4">
                      {DELIVERY_TERM_LISTS[section].map((item) => (
                        <li key={item}>{t(`delivery-terms.sections.${section}.items.${item}`)}</li>
                      ))}
                    </ul>
                  ) : null}

                  {section === 'deliveryFees' ? (
                    <p className="text-gray-600">{t('delivery-terms.sections.deliveryFees.checkoutNotice')}</p>
                  ) : null}

                  {section === 'orderConfirmation' ? (
                    <p className="text-gray-600">{t('delivery-terms.sections.orderConfirmation.electronicsNotice')}</p>
                  ) : null}

                  {section === 'specialNote' ? (
                    <p className="text-gray-600">{t('delivery-terms.sections.specialNote.returnNotice')}</p>
                  ) : null}
                </section>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

