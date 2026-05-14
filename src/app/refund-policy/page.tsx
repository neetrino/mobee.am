'use client';

import { Card } from '@shop/ui';
import { useTranslation } from '../../lib/i18n-client';

const REFUND_POLICY_SECTIONS = [
  'exchange',
  'return',
  'refund',
  'orderCancellation',
  'nonReturnable',
  'damagedOrIncorrect',
] as const;

const REFUND_POLICY_LISTS = {
  exchange: ['unused', 'noDamage', 'saleableCondition', 'factoryPackaging', 'fullSet', 'matchingIdentifier'],
  return: [
    'unused',
    'noMechanicalDamage',
    'noExternalImpact',
    'completePackaging',
    'fullSet',
    'noPersonalData',
    'matchingIdentifier',
  ],
  nonReturnable: [
    'usedPhones',
    'damagedProducts',
    'withoutPackaging',
    'incompleteSet',
    'accountLinked',
    'waterOrImpactDamage',
    'identifierMismatch',
    'openedAccessories',
  ],
} as const;

const REFUND_POLICY_EXTRA_PARAGRAPHS = {
  exchange: ['proofRequired'],
  return: ['wrongProduct'],
  refund: ['cardTiming', 'deliveryFee'],
  orderCancellation: ['shippedOrder'],
  damagedOrIncorrect: ['resolution'],
} as const;

type RefundPolicySection = (typeof REFUND_POLICY_SECTIONS)[number];
type RefundPolicyListSection = keyof typeof REFUND_POLICY_LISTS;
type RefundPolicyExtraSection = keyof typeof REFUND_POLICY_EXTRA_PARAGRAPHS;

const hasListItems = (section: RefundPolicySection): section is RefundPolicyListSection => {
  return section in REFUND_POLICY_LISTS;
};

const hasExtraParagraphs = (section: RefundPolicySection): section is RefundPolicyExtraSection => {
  return section in REFUND_POLICY_EXTRA_PARAGRAPHS;
};

/**
 * Refund Policy page - outlines return, exchange, and refund rules
 */
export default function RefundPolicyPage() {
  const { t } = useTranslation();

  return (
    <div className="policy-page">
      <div className="policy-page-inner">
        <h1 className="text-4xl font-bold text-gray-900">{t('refund-policy.title')}</h1>
        <p className="text-gray-600">
          {t('refund-policy.lastUpdated')}{' '}
          {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>

        <div className="mt-8 space-y-6">
          <Card className="p-6">
            <p className="text-gray-600">{t('refund-policy.intro')}</p>

            <div className="mt-6 space-y-6">
              {REFUND_POLICY_SECTIONS.map((section, index) => (
                <section key={section} className="space-y-3">
                  <h2 className="text-2xl font-semibold text-gray-900">
                    {index + 1}. {t(`refund-policy.sections.${section}.title`)}
                  </h2>
                  <p className="text-gray-600">{t(`refund-policy.sections.${section}.description`)}</p>

                  {hasListItems(section) ? (
                    <ul className="list-disc list-inside text-gray-600 ml-4">
                      {REFUND_POLICY_LISTS[section].map((item) => (
                        <li key={item}>{t(`refund-policy.sections.${section}.items.${item}`)}</li>
                      ))}
                    </ul>
                  ) : null}

                  {hasExtraParagraphs(section)
                    ? REFUND_POLICY_EXTRA_PARAGRAPHS[section].map((paragraph) => (
                        <p key={paragraph} className="text-gray-600">
                          {t(`refund-policy.sections.${section}.extra.${paragraph}`)}
                        </p>
                      ))
                    : null}
                </section>
              ))}

              <section className="space-y-3">
                <h2 className="text-2xl font-semibold text-gray-900">
                  {t('refund-policy.specialNote.title')}
                </h2>
                <p className="text-gray-600">{t('refund-policy.specialNote.description')}</p>
              </section>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}


