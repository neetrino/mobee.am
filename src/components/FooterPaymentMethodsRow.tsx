'use client';

import Image from 'next/image';
import { useTranslation } from '../lib/i18n-client';

const FOOTER_PAYMENT_IMAGE_BASE = '/images/footer/payments';

/** Figma mobee-new node 211:2265 — payment methods row in first footer column. */
const PAYMENT_CHIP_HEIGHT_PX = 30;
/** Tighter gap below `xl` so Idram / FastShift / Arca / Visa stay one row on iPad Pro; Figma spacing from `xl`. No overflow scroll — avoids a horizontal scrollbar “stripe”. */
const PAYMENT_CHIPS_ROW_LAYOUT_CLASS = 'flex flex-nowrap items-center gap-1 xl:gap-[11px]';

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

export function FooterPaymentMethodsRow() {
  const { t } = useTranslation();

  return (
    <div className={PAYMENT_CHIPS_ROW_LAYOUT_CLASS} aria-label={t('common.footer.legalBar.paymentMethodsLabel')}>
      {PAYMENT_TILES.map((tile) => (
        <PaymentLogoChip key={tile.file} tile={tile} />
      ))}
    </div>
  );
}
