'use client';

import { Montserrat } from 'next/font/google';
import { useTranslation } from '../lib/i18n-client';
import { SITE_CONTENT_GUTTERS_CLASS } from './header-strip-layout';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '600', '900'],
  display: 'swap',
});

/**
 * Footer legal strip with brand and copyright.
 */
export function FooterPaymentStrip() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <div className={montserrat.className}>
      <div
        className={`${SITE_CONTENT_GUTTERS_CLASS} flex min-w-0 flex-row flex-nowrap items-baseline gap-6 overflow-x-auto pb-8 pt-[33px]`}
        className={`${SITE_CONTENT_GUTTERS_CLASS} flex max-w-full flex-row flex-nowrap items-baseline gap-6 overflow-x-auto pb-8 pt-[33px]`}
      >
        <p className="shrink-0 text-[18px] font-black leading-[28px] text-black">
          {t('common.footer.legalBar.brand')}
        </p>
        <p className="whitespace-nowrap text-[16px] leading-5 text-[#a1a1aa]">
          <span>{t('common.footer.legalBar.copyrightLead').replace('{year}', String(year))} </span>
          <span>{t('common.footer.legalBar.createdBy')} </span>
          <span className="font-semibold text-[#a1a1aa]">{t('common.footer.legalBar.creditCompany')}</span>
        </p>
      </div>
    </div>
  );
}
