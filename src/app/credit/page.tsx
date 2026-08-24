'use client';

import { Card } from '@shop/ui';
import { PolicyBackButton } from '@/components/PolicyBackButton';
import { useTranslation } from '../../lib/i18n-client';

const ELIGIBILITY_ITEMS = [
  'age',
  'citizen',
  'employment',
  'documents',
  'foreigners',
  'online',
] as const;

const GENERAL_TERM_ITEMS = ['downPayment', 'interest', 'term', 'serviceFee'] as const;

const PARTNER_BANKS = [
  {
    id: 'acba',
    items: [
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
  },
  {
    id: 'aeb',
    items: ['currency', 'amount', 'annualRate', 'effectiveRate', 'term', 'downPayment', 'serviceFee'],
  },
  {
    id: 'ineco',
    items: [
      'age',
      'amount',
      'term',
      'nominalRate',
      'effectiveRate',
      'monthlyFee',
      'latePenalty',
      'earlyRepayment',
    ],
  },
  {
    id: 'vtb',
    items: ['age', 'nominalRate', 'term', 'maxAmount', 'minAmount', 'penalty'],
  },
  {
    id: 'ameria',
    items: ['effectiveRate', 'amount', 'term'],
  },
  {
    id: 'unibank',
    items: ['effectiveRate', 'productPage', 'bankSite', 'contacts', 'supervision'],
  },
  {
    id: 'evoca',
    items: [
      'borrower',
      'currency',
      'disbursement',
      'term',
      'amount',
      'commission',
      'annualRate',
      'partnerFee',
    ],
  },
] as const;

/**
 * Installment (aparik) terms page — eligibility, general terms, and partner banks.
 */
export default function CreditTermsPage() {
  const { t } = useTranslation();

  return (
    <div className="policy-page">
      <div className="policy-page-inner">
        <PolicyBackButton />
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl md:text-4xl">{t('credit.title')}</h1>
        <p className="text-gray-600">
          {t('credit.lastUpdated')}{' '}
          {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>

        <div className="mt-6 space-y-6 md:mt-8">
          <Card className="p-4 sm:p-6">
            <p className="text-gray-600">{t('credit.intro')}</p>

            <div className="mt-6 space-y-6">
              <section className="space-y-3">
                <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">
                  1. {t('credit.sections.eligibility.title')}
                </h2>
                <p className="text-gray-600">{t('credit.sections.eligibility.description')}</p>
                <ul className="ml-4 list-inside list-disc text-gray-600">
                  {ELIGIBILITY_ITEMS.map((item) => (
                    <li key={item}>{t(`credit.sections.eligibility.items.${item}`)}</li>
                  ))}
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">
                  2. {t('credit.sections.generalTerms.title')}
                </h2>
                <p className="text-gray-600">{t('credit.sections.generalTerms.description')}</p>
                <ul className="ml-4 list-inside list-disc text-gray-600">
                  {GENERAL_TERM_ITEMS.map((item) => (
                    <li key={item}>{t(`credit.sections.generalTerms.items.${item}`)}</li>
                  ))}
                </ul>
              </section>

              <section className="space-y-6">
                <div className="space-y-3">
                  <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">
                    3. {t('credit.sections.partnerBanks.title')}
                  </h2>
                  <p className="text-gray-600">{t('credit.sections.partnerBanks.description')}</p>
                </div>

                {PARTNER_BANKS.map((bank) => (
                  <section key={bank.id} className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-900 sm:text-xl">
                      {t(`credit.banks.${bank.id}.name`)}
                    </h3>
                    <ul className="ml-4 list-inside list-disc text-gray-600">
                      {bank.items.map((item) => (
                        <li key={item}>{t(`credit.banks.${bank.id}.items.${item}`)}</li>
                      ))}
                    </ul>
                  </section>
                ))}
              </section>

              <section className="space-y-3">
                <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">
                  4. {t('credit.sections.disclaimer.title')}
                </h2>
                <p className="text-gray-600">{t('credit.sections.disclaimer.description')}</p>
              </section>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
