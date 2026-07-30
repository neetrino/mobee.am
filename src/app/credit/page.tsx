'use client';

import { Card } from '@shop/ui';
import { useTranslation } from '../../lib/i18n-client';

const ELIGIBILITY_ITEMS = [
  'age',
  'citizen',
  'employment',
  'documents',
  'foreign',
  'online',
] as const;

const GENERAL_TERM_ITEMS = ['downPayment', 'interest', 'term', 'serviceFee'] as const;

const BANK_KEYS = [
  'acba',
  'armeconombank',
  'ineco',
  'vtb',
  'ameria',
  'unibank',
  'evoca',
] as const;

const BANK_ITEM_KEYS = {
  acba: [
    'minTerm',
    'maxTerm',
    'minAmount',
    'maxAmount',
    'collateral',
    'nominalRate',
    'effectiveRate',
    'repayment',
    'commission',
    'interestCalc',
  ],
  armeconombank: [
    'currency',
    'amount',
    'annualRate',
    'effectiveRate',
    'term',
    'downPayment',
    'serviceFee',
  ],
  ineco: [
    'age',
    'amount',
    'term',
    'nominalRate',
    'effectiveRate',
    'serviceFee',
    'lateFee',
    'earlyRepayment',
  ],
  vtb: ['age', 'nominalRate', 'term', 'maxAmount', 'minAmount', 'penalty'],
  ameria: ['effectiveRate', 'amount', 'term'],
  unibank: ['effectiveRate', 'productPage', 'bankSite', 'contacts', 'regulation'],
  evoca: [
    'borrower',
    'currency',
    'disbursement',
    'term',
    'amount',
    'clientFee',
    'annualRate',
    'partnerFee',
  ],
} as const;

type BankKey = (typeof BANK_KEYS)[number];

/**
 * Installment / credit terms page — eligibility, general terms, and partner banks.
 */
export default function CreditTermsPage() {
  const { t } = useTranslation();

  return (
    <div className="policy-page">
      <div className="policy-page-inner">
        <h1 className="text-4xl font-bold text-gray-900">{t('credit-terms.title')}</h1>
        <p className="text-gray-600">
          {t('credit-terms.lastUpdated')}{' '}
          {new Date().toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>

        <div className="mt-8 space-y-6">
          <Card className="p-6">
            <p className="text-gray-600">{t('credit-terms.intro')}</p>

            <div className="mt-6 space-y-6">
              <section className="space-y-3">
                <h2 className="text-2xl font-semibold text-gray-900">
                  1. {t('credit-terms.sections.eligibility.title')}
                </h2>
                <p className="text-gray-600">{t('credit-terms.sections.eligibility.description')}</p>
                <ul className="ml-4 list-inside list-disc text-gray-600">
                  {ELIGIBILITY_ITEMS.map((item) => (
                    <li key={item}>{t(`credit-terms.sections.eligibility.items.${item}`)}</li>
                  ))}
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="text-2xl font-semibold text-gray-900">
                  2. {t('credit-terms.sections.generalTerms.title')}
                </h2>
                <p className="text-gray-600">{t('credit-terms.sections.generalTerms.description')}</p>
                <ul className="ml-4 list-inside list-disc text-gray-600">
                  {GENERAL_TERM_ITEMS.map((item) => (
                    <li key={item}>{t(`credit-terms.sections.generalTerms.items.${item}`)}</li>
                  ))}
                </ul>
              </section>

              <section className="space-y-6">
                <div className="space-y-3">
                  <h2 className="text-2xl font-semibold text-gray-900">
                    3. {t('credit-terms.sections.partnerBanks.title')}
                  </h2>
                  <p className="text-gray-600">{t('credit-terms.sections.partnerBanks.description')}</p>
                </div>

                {BANK_KEYS.map((bank) => (
                  <BankTermsBlock key={bank} bank={bank} t={t} />
                ))}
              </section>

              <section className="space-y-3">
                <h2 className="text-2xl font-semibold text-gray-900">
                  4. {t('credit-terms.sections.disclaimer.title')}
                </h2>
                <p className="text-gray-600">{t('credit-terms.sections.disclaimer.description')}</p>
              </section>

              <section className="space-y-3">
                <h2 className="text-2xl font-semibold text-gray-900">
                  5. {t('credit-terms.sections.contact.title')}
                </h2>
                <p className="text-gray-600">{t('credit-terms.sections.contact.description')}</p>
              </section>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

type BankTermsBlockProps = {
  readonly bank: BankKey;
  readonly t: (key: string) => string;
};

function BankTermsBlock({ bank, t }: BankTermsBlockProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-xl font-semibold text-gray-900">{t(`credit-terms.banks.${bank}.name`)}</h3>
      <ul className="ml-4 list-inside list-disc text-gray-600">
        {BANK_ITEM_KEYS[bank].map((item) => (
          <li key={item}>{t(`credit-terms.banks.${bank}.items.${item}`)}</li>
        ))}
      </ul>
    </div>
  );
}
