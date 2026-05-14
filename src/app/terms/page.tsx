'use client';

import { Card } from '@shop/ui';
import { useTranslation } from '../../lib/i18n-client';

type TermsListItem = {
  readonly key: string;
  readonly labelKey: string;
  readonly descriptionKey?: string;
};

type TermsBlock =
  | {
      readonly type: 'paragraph';
      readonly key: string;
    }
  | {
      readonly type: 'list';
      readonly introKey?: string;
      readonly items: readonly TermsListItem[];
    };

type TermsSection = {
  readonly key: string;
  readonly titleKey: string;
  readonly blocks: readonly TermsBlock[];
};

const TERMS_SECTIONS: readonly TermsSection[] = [
  {
    key: 'general',
    titleKey: 'terms.sections.general.title',
    blocks: [
      { type: 'paragraph', key: 'terms.sections.general.paragraphs.scope' },
      { type: 'paragraph', key: 'terms.sections.general.paragraphs.acceptance' },
      { type: 'paragraph', key: 'terms.sections.general.paragraphs.disagreement' },
      { type: 'paragraph', key: 'terms.sections.general.paragraphs.changes' },
      { type: 'paragraph', key: 'terms.sections.general.paragraphs.continuedUse' },
    ],
  },
  {
    key: 'definitions',
    titleKey: 'terms.sections.definitions.title',
    blocks: [
      {
        type: 'list',
        introKey: 'terms.sections.definitions.intro',
        items: [
          {
            key: 'website',
            labelKey: 'terms.sections.definitions.items.website.label',
            descriptionKey: 'terms.sections.definitions.items.website.description',
          },
          {
            key: 'user',
            labelKey: 'terms.sections.definitions.items.user.label',
            descriptionKey: 'terms.sections.definitions.items.user.description',
          },
          {
            key: 'services',
            labelKey: 'terms.sections.definitions.items.services.label',
            descriptionKey: 'terms.sections.definitions.items.services.description',
          },
          {
            key: 'content',
            labelKey: 'terms.sections.definitions.items.content.label',
            descriptionKey: 'terms.sections.definitions.items.content.description',
          },
          {
            key: 'intellectualProperty',
            labelKey: 'terms.sections.definitions.items.intellectualProperty.label',
            descriptionKey: 'terms.sections.definitions.items.intellectualProperty.description',
          },
          {
            key: 'transaction',
            labelKey: 'terms.sections.definitions.items.transaction.label',
            descriptionKey: 'terms.sections.definitions.items.transaction.description',
          },
        ],
      },
    ],
  },
  {
    key: 'userObligations',
    titleKey: 'terms.sections.userObligations.title',
    blocks: [
      {
        type: 'list',
        introKey: 'terms.sections.userObligations.intro',
        items: [
          { key: 'lawful', labelKey: 'terms.sections.userObligations.items.lawful.label' },
          { key: 'technical', labelKey: 'terms.sections.userObligations.items.technical.label' },
          { key: 'malware', labelKey: 'terms.sections.userObligations.items.malware.label' },
          { key: 'access', labelKey: 'terms.sections.userObligations.items.access.label' },
          { key: 'content', labelKey: 'terms.sections.userObligations.items.content.label' },
        ],
      },
      { type: 'paragraph', key: 'terms.sections.userObligations.paragraphs.blocking' },
    ],
  },
  {
    key: 'liability',
    titleKey: 'terms.sections.liability.title',
    blocks: [
      { type: 'paragraph', key: 'terms.sections.liability.paragraphs.asIs' },
      {
        type: 'list',
        introKey: 'terms.sections.liability.intro',
        items: [
          { key: 'errors', labelKey: 'terms.sections.liability.items.errors.label' },
          { key: 'userInfo', labelKey: 'terms.sections.liability.items.userInfo.label' },
          { key: 'thirdParty', labelKey: 'terms.sections.liability.items.thirdParty.label' },
          { key: 'content', labelKey: 'terms.sections.liability.items.content.label' },
        ],
      },
      { type: 'paragraph', key: 'terms.sections.liability.paragraphs.indirectDamages' },
    ],
  },
  {
    key: 'intellectualProperty',
    titleKey: 'terms.sections.intellectualProperty.title',
    blocks: [
      { type: 'paragraph', key: 'terms.sections.intellectualProperty.paragraphs.ownership' },
      { type: 'paragraph', key: 'terms.sections.intellectualProperty.paragraphs.prohibitedCopying' },
      { type: 'paragraph', key: 'terms.sections.intellectualProperty.paragraphs.trademarkUse' },
    ],
  },
  {
    key: 'paymentsRefunds',
    titleKey: 'terms.sections.paymentsRefunds.title',
    blocks: [
      { type: 'paragraph', key: 'terms.sections.paymentsRefunds.paragraphs.paidServices' },
      { type: 'paragraph', key: 'terms.sections.paymentsRefunds.paragraphs.priceChanges' },
      { type: 'paragraph', key: 'terms.sections.paymentsRefunds.paragraphs.refunds' },
    ],
  },
  {
    key: 'disputes',
    titleKey: 'terms.sections.disputes.title',
    blocks: [
      { type: 'paragraph', key: 'terms.sections.disputes.paragraphs.law' },
      { type: 'paragraph', key: 'terms.sections.disputes.paragraphs.negotiations' },
      { type: 'paragraph', key: 'terms.sections.disputes.paragraphs.courts' },
    ],
  },
  {
    key: 'forceMajeure',
    titleKey: 'terms.sections.forceMajeure.title',
    blocks: [
      {
        type: 'list',
        introKey: 'terms.sections.forceMajeure.intro',
        items: [
          { key: 'naturalDisasters', labelKey: 'terms.sections.forceMajeure.items.naturalDisasters.label' },
          { key: 'government', labelKey: 'terms.sections.forceMajeure.items.government.label' },
          { key: 'conflicts', labelKey: 'terms.sections.forceMajeure.items.conflicts.label' },
          { key: 'technicalFailures', labelKey: 'terms.sections.forceMajeure.items.technicalFailures.label' },
        ],
      },
    ],
  },
  {
    key: 'privacy',
    titleKey: 'terms.sections.privacy.title',
    blocks: [
      { type: 'paragraph', key: 'terms.sections.privacy.paragraphs.policy' },
      { type: 'paragraph', key: 'terms.sections.privacy.paragraphs.processing' },
      { type: 'paragraph', key: 'terms.sections.privacy.paragraphs.authorities' },
    ],
  },
] as const;

type TermsSectionProps = {
  readonly section: TermsSection;
  readonly sectionNumber: number;
  readonly t: (translationKey: string) => string;
};

function TermsSectionBlock({ section, sectionNumber, t }: TermsSectionProps) {
  let paragraphNumber = 1;

  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-semibold text-gray-900">
        {sectionNumber}. {t(section.titleKey)}
      </h2>

      {section.blocks.map((block) => {
        const blockNumber = paragraphNumber;

        if (block.type === 'paragraph') {
          paragraphNumber += 1;
          return (
            <p key={block.key} className="text-gray-600">
              {sectionNumber}.{blockNumber}. {t(block.key)}
            </p>
          );
        }

        if (block.introKey) {
          paragraphNumber += 1;
        }

        return (
          <div key={block.introKey ?? `${section.key}-list`} className="space-y-2">
            {block.introKey && (
              <p className="text-gray-600">
                {sectionNumber}.{blockNumber}. {t(block.introKey)}
              </p>
            )}
            <ul className="list-disc list-inside text-gray-600 ml-4">
              {block.items.map((item) => (
                <li key={item.key}>
                  <span className="font-medium">{t(item.labelKey)}</span>
                  {item.descriptionKey && <> - {t(item.descriptionKey)}</>}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}

/**
 * Terms of Service page - displays terms and conditions
 */
export default function TermsPage() {
  const { t } = useTranslation();
  return (
    <div className="policy-page">
      <div className="policy-page-inner">
        <h1 className="text-4xl font-bold text-gray-900">{t('terms.title')}</h1>
        <p className="text-gray-600">
          {t('terms.lastUpdated')}{' '}
          {new Date().toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>

        <div className="mt-8 space-y-6">
          <Card className="p-6 space-y-6">
            {TERMS_SECTIONS.map((section, index) => (
              <TermsSectionBlock
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

