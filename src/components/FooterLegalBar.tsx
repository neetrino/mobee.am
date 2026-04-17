'use client';

import Link from 'next/link';
import { Montserrat } from 'next/font/google';
import { useTranslation } from '../lib/i18n-client';
import { FooterCurrency } from './FooterCurrency';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '600', '900'],
  display: 'swap',
});

const policyLinkClass =
  'text-[11px] font-semibold uppercase tracking-[0.55px] text-[#a1a1aa] transition-colors hover:text-gray-700';

export function FooterLegalBar() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  const policies = [
    { href: '/privacy', label: t('common.footer.legalBar.privacyPolicy') },
    { href: '/delivery', label: t('common.footer.legalBar.shippingPolicy') },
    { href: '/returns', label: t('common.footer.legalBar.returnPolicy') },
    { href: '/terms', label: t('common.footer.legalBar.termsOfUse') },
  ] as const;

  return (
    <div className={`${montserrat.className} mt-12 border-t border-[#eeeef0]`}>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pb-8 pt-[33px] sm:px-6 lg:flex-row lg:flex-wrap lg:items-center lg:gap-5 lg:px-12">
        <div className="shrink-0 text-[18px] font-black leading-[28px] text-black">
          {t('common.footer.legalBar.brand')}
        </div>

        <div className="min-w-0 max-w-[314px] shrink-0 text-[16px] leading-5 text-[#a1a1aa]">
          <span className="leading-[20px]">
            {t('common.footer.legalBar.copyrightLead').replace('{year}', String(year))}{' '}
            {t('common.footer.legalBar.createdBy')}{' '}
          </span>
          <span className="font-semibold leading-[20px] text-[#a1a1aa]">
            {t('common.footer.legalBar.creditCompany')}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 lg:ml-auto">
          <nav
            className="flex flex-wrap items-center gap-x-2.5 gap-y-2"
            aria-label={t('common.footer.legalBar.policiesNavLabel')}
          >
            {policies.map(({ href, label }) => (
              <Link key={href} href={href} className={`${policyLinkClass} py-1.5`}>
                {label}
              </Link>
            ))}
          </nav>
          <div className="hidden md:block">
            <FooterCurrency />
          </div>
        </div>
      </div>
    </div>
  );
}
