'use client';

import { Card } from '@shop/ui';
import { useTranslation } from '../../lib/i18n-client';

type PrivacyListItem = {
  readonly key: string;
  readonly labelKey: string;
  readonly descriptionKey?: string;
};

type PrivacySection = {
  readonly key: string;
  readonly titleKey: string;
  readonly descriptionKey?: string;
  readonly items?: readonly PrivacyListItem[];
  readonly closingKey?: string;
};

const PRIVACY_INTRO_KEYS = [
  'privacy.introduction.consent',
  'privacy.introduction.personalData',
  'privacy.introduction.definitions',
] as const;

const PRIVACY_SECTIONS: readonly PrivacySection[] = [
  {
    key: 'collectedData',
    titleKey: 'privacy.sections.collectedData.title',
    descriptionKey: 'privacy.sections.collectedData.description',
    items: [
      {
        key: 'contact',
        labelKey: 'privacy.sections.collectedData.items.contact.label',
        descriptionKey: 'privacy.sections.collectedData.items.contact.description',
      },
      {
        key: 'purchase',
        labelKey: 'privacy.sections.collectedData.items.purchase.label',
        descriptionKey: 'privacy.sections.collectedData.items.purchase.description',
      },
      {
        key: 'technical',
        labelKey: 'privacy.sections.collectedData.items.technical.label',
        descriptionKey: 'privacy.sections.collectedData.items.technical.description',
      },
      {
        key: 'cookies',
        labelKey: 'privacy.sections.collectedData.items.cookies.label',
        descriptionKey: 'privacy.sections.collectedData.items.cookies.description',
      },
    ],
  },
  {
    key: 'dataUse',
    titleKey: 'privacy.sections.dataUse.title',
    descriptionKey: 'privacy.sections.dataUse.description',
    items: [
      { key: 'orders', labelKey: 'privacy.sections.dataUse.items.orders.label' },
      { key: 'support', labelKey: 'privacy.sections.dataUse.items.support.label' },
      { key: 'improvements', labelKey: 'privacy.sections.dataUse.items.improvements.label' },
      { key: 'legal', labelKey: 'privacy.sections.dataUse.items.legal.label' },
    ],
  },
  {
    key: 'retention',
    titleKey: 'privacy.sections.retention.title',
    descriptionKey: 'privacy.sections.retention.description',
    items: [
      {
        key: 'account',
        labelKey: 'privacy.sections.retention.items.account.label',
        descriptionKey: 'privacy.sections.retention.items.account.description',
      },
      {
        key: 'purchaseHistory',
        labelKey: 'privacy.sections.retention.items.purchaseHistory.label',
        descriptionKey: 'privacy.sections.retention.items.purchaseHistory.description',
      },
      {
        key: 'marketing',
        labelKey: 'privacy.sections.retention.items.marketing.label',
        descriptionKey: 'privacy.sections.retention.items.marketing.description',
      },
    ],
  },
  {
    key: 'security',
    titleKey: 'privacy.sections.security.title',
    descriptionKey: 'privacy.sections.security.description',
    items: [
      {
        key: 'ssl',
        labelKey: 'privacy.sections.security.items.ssl.label',
        descriptionKey: 'privacy.sections.security.items.ssl.description',
      },
      {
        key: 'access',
        labelKey: 'privacy.sections.security.items.access.label',
        descriptionKey: 'privacy.sections.security.items.access.description',
      },
      {
        key: 'audits',
        labelKey: 'privacy.sections.security.items.audits.label',
        descriptionKey: 'privacy.sections.security.items.audits.description',
      },
    ],
  },
  {
    key: 'sharing',
    titleKey: 'privacy.sections.sharing.title',
    descriptionKey: 'privacy.sections.sharing.description',
    items: [
      {
        key: 'shipping',
        labelKey: 'privacy.sections.sharing.items.shipping.label',
        descriptionKey: 'privacy.sections.sharing.items.shipping.description',
      },
      {
        key: 'payments',
        labelKey: 'privacy.sections.sharing.items.payments.label',
        descriptionKey: 'privacy.sections.sharing.items.payments.description',
      },
      {
        key: 'law',
        labelKey: 'privacy.sections.sharing.items.law.label',
        descriptionKey: 'privacy.sections.sharing.items.law.description',
      },
    ],
    closingKey: 'privacy.sections.sharing.closing',
  },
  {
    key: 'rights',
    titleKey: 'privacy.sections.rights.title',
    descriptionKey: 'privacy.sections.rights.description',
    items: [
      { key: 'copy', labelKey: 'privacy.sections.rights.items.copy.label' },
      { key: 'edit', labelKey: 'privacy.sections.rights.items.edit.label' },
      { key: 'unsubscribe', labelKey: 'privacy.sections.rights.items.unsubscribe.label' },
      { key: 'restrict', labelKey: 'privacy.sections.rights.items.restrict.label' },
    ],
  },
  {
    key: 'cookiesUsage',
    titleKey: 'privacy.sections.cookiesUsage.title',
    descriptionKey: 'privacy.sections.cookiesUsage.description',
    items: [
      {
        key: 'functional',
        labelKey: 'privacy.sections.cookiesUsage.items.functional.label',
        descriptionKey: 'privacy.sections.cookiesUsage.items.functional.description',
      },
      {
        key: 'analytics',
        labelKey: 'privacy.sections.cookiesUsage.items.analytics.label',
        descriptionKey: 'privacy.sections.cookiesUsage.items.analytics.description',
      },
      {
        key: 'marketing',
        labelKey: 'privacy.sections.cookiesUsage.items.marketing.label',
        descriptionKey: 'privacy.sections.cookiesUsage.items.marketing.description',
      },
    ],
    closingKey: 'privacy.sections.cookiesUsage.closing',
  },
  {
    key: 'changes',
    titleKey: 'privacy.sections.changes.title',
    descriptionKey: 'privacy.sections.changes.description',
  },
] as const;

type PrivacyPolicySectionProps = {
  readonly section: PrivacySection;
  readonly sectionNumber: number;
  readonly t: (translationKey: string) => string;
};

function PrivacyPolicySection({
  section,
  sectionNumber,
  t,
}: PrivacyPolicySectionProps) {
  return (
    <section>
      <h2 className="text-2xl font-semibold text-gray-900">
        {sectionNumber}. {t(section.titleKey)}
      </h2>

      {section.descriptionKey && (
        <p className="text-gray-600">{t(section.descriptionKey)}</p>
      )}

      {section.items && (
        <ul className="list-disc list-inside text-gray-600 ml-4">
          {section.items.map((item) => (
            <li key={item.key}>
              <span className="font-medium">{t(item.labelKey)}</span>
              {item.descriptionKey && <> - {t(item.descriptionKey)}</>}
            </li>
          ))}
        </ul>
      )}

      {section.closingKey && (
        <p className="text-gray-600">{t(section.closingKey)}</p>
      )}
    </section>
  );
}

/**
 * Privacy Policy page - displays privacy policy information
 */
export default function PrivacyPage() {
  const { t } = useTranslation();
  return (
    <div className="policy-page">
      <div className="policy-page-inner">
        <h1 className="text-4xl font-bold text-gray-900">{t('privacy.title')}</h1>
        <p className="text-gray-600">
          {t('privacy.lastUpdated')}{' '}
          {new Date().toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>

        <div className="mt-8 space-y-6">
          <Card className="p-6">
            <div className="space-y-4">
              {PRIVACY_INTRO_KEYS.map((translationKey) => (
                <p key={translationKey} className="text-gray-600">
                  {t(translationKey)}
                </p>
              ))}
            </div>

            {PRIVACY_SECTIONS.map((section, index) => (
              <PrivacyPolicySection
                key={section.key}
                section={section}
                sectionNumber={index + 1}
                t={t}
              />
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

