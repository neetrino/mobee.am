'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from '@/lib/i18n-client';

const POLICY_LINKS = [
  {
    href: '/delivery-terms',
    translationKey: 'common.footer.policiesRow.delivery',
  },
  {
    href: '/refund-policy',
    translationKey: 'common.footer.policiesRow.refund',
  },
  {
    href: '/credit',
    translationKey: 'common.footer.policiesRow.credit',
  },
  {
    href: '/terms',
    translationKey: 'common.footer.policiesRow.terms',
  },
  {
    href: '/privacy',
    translationKey: 'common.footer.policiesRow.privacy',
  },
] as const;

/** Hub page providing access to every storefront policy. */
export default function PoliciesPage() {
  const { t } = useTranslation();

  return (
    <main className="min-h-[calc(100dvh-8rem)] bg-[#f4f2f2] px-4 pb-28 pt-12 sm:px-6 md:py-16 lg:bg-gray-50">
      <div className="mx-auto w-full max-w-4xl">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          {t('common.footer.policiesHeading')}
        </h1>

        <nav
          className="mt-8 grid gap-4 sm:mt-10"
          aria-label={t('common.footer.legalBar.policiesNavLabel')}
        >
          {POLICY_LINKS.map((policy) => (
            <Link
              key={policy.href}
              href={policy.href}
              prefetch
              className="group flex min-h-[86px] items-center justify-between gap-5 rounded-[22px] bg-white px-5 py-5 text-lg font-semibold leading-snug text-gray-900 shadow-[0_2px_10px_rgba(15,23,42,0.04)] transition-[transform,box-shadow] active:scale-[0.99] sm:px-7 sm:text-xl lg:hover:-translate-y-0.5 lg:hover:shadow-md"
            >
              <span>{t(policy.translationKey)}</span>
              <ChevronRight
                className="size-5 shrink-0 text-[#2db2ff] transition-transform group-hover:translate-x-0.5"
                strokeWidth={2.25}
                aria-hidden
              />
            </Link>
          ))}
        </nav>
      </div>
    </main>
  );
}
