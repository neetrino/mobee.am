'use client';

import Image from 'next/image';
import { Montserrat } from 'next/font/google';
import { useTranslation } from '../lib/i18n-client';
import { SITE_CONTENT_GUTTERS_CLASS } from './header-strip-layout';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '600', '900'],
  display: 'swap',
});

const FOOTER_PAYMENT_IMAGE_BASE = '/images/footer/payments';

/** Figma mobee-new node 1:301 — chip frame height */
const PAYMENT_CHIP_HEIGHT_PX = 30;

/** Figma — gap between MOBEE wordmark and payment row */
const MOBEE_PAYMENTS_GAP_CLASS = 'gap-[31px]';

/** Figma — gap between payment chips */
const PAYMENT_CHIPS_GAP_CLASS = 'gap-[11px]';

type PaymentTile = {
  readonly file: string;
  readonly chipWidthClass: string;
  readonly imgWidth: number;
  readonly imgHeight: number;
};

const PAYMENT_TILES: readonly PaymentTile[] = [
  { file: 'idram', chipWidthClass: 'w-[73px]', imgWidth: 66, imgHeight: 17 },
  { file: 'fastshift', chipWidthClass: 'w-[73px]', imgWidth: 61, imgHeight: 16 },
  { file: 'arca', chipWidthClass: 'w-[74px]', imgWidth: 50, imgHeight: 13 },
  { file: 'visa', chipWidthClass: 'w-[73px]', imgWidth: 48, imgHeight: 22 },
];

function PaymentLogoChip({ tile }: { tile: PaymentTile }) {
  const src = `${FOOTER_PAYMENT_IMAGE_BASE}/${tile.file}.png`;
  return (
    <div
      className={`flex ${tile.chipWidthClass} shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#f6f7f9]`}
      style={{ height: PAYMENT_CHIP_HEIGHT_PX }}
    >
      <Image
        src={src}
        alt=""
        width={tile.imgWidth}
        height={tile.imgHeight}
        className="max-h-full w-auto object-contain"
      />
    </div>
  );
}

/**
 * Figma mobee-new node 1:301 — bottom strip: MOBEE wordmark, payment marks, copyright.
 */
export function FooterPaymentStrip() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <div className={`${montserrat.className} border-t border-[#eeeef0]`}>
      <div
        className={`${SITE_CONTENT_GUTTERS_CLASS} flex flex-col gap-6 pb-8 pt-[33px] lg:flex-row lg:items-center lg:justify-between lg:gap-8`}
      >
        <div className={`flex flex-col ${MOBEE_PAYMENTS_GAP_CLASS} lg:flex-row lg:items-center`}>
          <p className="text-[18px] font-black leading-[28px] text-black whitespace-nowrap">
            {t('common.footer.legalBar.brand')}
          </p>
          <div
            className={`flex flex-wrap items-center ${PAYMENT_CHIPS_GAP_CLASS}`}
            aria-label={t('common.footer.legalBar.paymentMethodsLabel')}
          >
            {PAYMENT_TILES.map((tile) => (
              <PaymentLogoChip key={tile.file} tile={tile} />
            ))}
          </div>
        </div>

        <p className="max-w-[min(100%,420px)] text-[16px] leading-5 text-[#a1a1aa] lg:max-w-[360px] lg:text-right">
          <span>{t('common.footer.legalBar.copyrightLead').replace('{year}', String(year))} </span>
          <span>{t('common.footer.legalBar.createdBy')} </span>
          <span className="font-semibold text-[#a1a1aa]">{t('common.footer.legalBar.creditCompany')}</span>
        </p>
      </div>
    </div>
  );
}
