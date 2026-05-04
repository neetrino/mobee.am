'use client';

import Link from 'next/link';
import { Montserrat } from 'next/font/google';
import { useTranslation } from '../lib/i18n-client';
import { SITE_CONTENT_GUTTERS_CLASS } from './header-strip-layout';
import { FooterCurrency } from './FooterCurrency';
import { FooterPaymentStrip } from './FooterPaymentStrip';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '600', '900'],
  display: 'swap',
});

const policyLinkClass =
  'text-[10px] font-semibold uppercase tracking-[0.5px] text-[#a1a1aa] transition-colors hover:text-gray-700';

export function FooterLegalBar() {
  const { t, lang } = useTranslation();
  const isArmenian = lang === 'hy';

  const policies = [
    { href: '/privacy', label: t('common.footer.legalBar.privacyPolicy') },
    { href: '/delivery', label: t('common.footer.legalBar.shippingPolicy') },
    { href: '/returns', label: t('common.footer.legalBar.returnPolicy') },
    { href: '/terms', label: t('common.footer.legalBar.termsOfUse') },
  ] as const;

  return (
    <div className={`${montserrat.className} border-t border-[#eeeef0] bg-white`}>
      <div
        className={`${SITE_CONTENT_GUTTERS_CLASS} flex w-full flex-wrap items-center gap-x-[9px] gap-y-2 pb-6 pt-[33px] lg:flex-nowrap lg:justify-end`}
      >
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

      <FooterPaymentStrip />
    </div>
  );
}
