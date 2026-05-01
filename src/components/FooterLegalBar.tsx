'use client';

import Link from 'next/link';
import { Montserrat } from 'next/font/google';
import { useTranslation } from '../lib/i18n-client';
import { SITE_CONTENT_GUTTERS_CLASS } from './header-strip-layout';
import { FooterCurrency } from './FooterCurrency';
import { SiteBrandLogo } from './SiteBrandLogo';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '600', '900'],
  display: 'swap',
});

const policyLinkClass =
  'text-[10px] font-semibold uppercase tracking-[0.5px] text-[#a1a1aa] transition-colors hover:text-gray-700';

export function FooterLegalBar() {
  const { t, lang } = useTranslation();
  const year = new Date().getFullYear();
  const isArmenian = lang === 'hy';

  const policies = [
    { href: '/privacy', label: t('common.footer.legalBar.privacyPolicy') },
    { href: '/delivery', label: t('common.footer.legalBar.shippingPolicy') },
    { href: '/returns', label: t('common.footer.legalBar.returnPolicy') },
    { href: '/terms', label: t('common.footer.legalBar.termsOfUse') },
  ] as const;

  return (
    <div className={`${montserrat.className} border-t border-[#eeeef0]`}>
      <div className={`${SITE_CONTENT_GUTTERS_CLASS} flex w-full flex-col gap-5 pb-8 pt-[33px] lg:flex-row lg:flex-nowrap lg:items-center lg:gap-4`}>
        <div className="shrink-0">
          <SiteBrandLogo
            alt={t('common.ariaLabels.siteLogo')}
            sizeClass="h-9 w-9"
            className="rounded-lg ring-1 ring-black/5"
          />
        </div>

        <div className="min-w-0 max-w-[283px] shrink-0 text-[14px] leading-[18px] text-[#a1a1aa]">
          <span className="leading-[18px]">
            {t('common.footer.legalBar.copyrightLead').replace('{year}', String(year))}{' '}
            {t('common.footer.legalBar.createdBy')}{' '}
          </span>
          <span className="font-semibold leading-[18px] text-[#a1a1aa]">
            {t('common.footer.legalBar.creditCompany')}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-[9px] gap-y-2 lg:ml-auto">
          <nav
            className="flex flex-wrap items-center gap-x-[9px] gap-y-2"
            aria-label={t('common.footer.legalBar.policiesNavLabel')}
          >
            {policies.map(({ href, label }) => (
              <Link key={href} href={href} className={`${policyLinkClass} py-1`}>
                {label}
              </Link>
            ))}
          </nav>
          <div className={`${isArmenian ? 'hidden' : 'hidden md:block'}`}>
            <FooterCurrency />
          </div>
        </div>
      </div>
    </div>
  );
}
