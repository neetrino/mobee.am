'use client';

import Image from 'next/image';
import { useTranslation } from '../lib/i18n-client';
import { PAYMENT_ICON_SRC, UI_ICONS_BASE } from '../lib/constants/ui-icons.constants';

const FOOTER_PAYMENT_IMAGE_BASE = `${UI_ICONS_BASE}/payments`;

/** Figma mobee-new node 211:2265 — payment methods row in first footer column. */
const PAYMENT_CHIP_HEIGHT_PX = 30;
/** Tighter gap below `xl` so Idram / FastShift / Arca / Visa stay one row on iPad Pro; Figma spacing from `xl`. No overflow scroll — avoids a horizontal scrollbar “stripe”. */
const PAYMENT_CHIPS_ROW_LAYOUT_CLASS = 'flex flex-nowrap items-center gap-5 xl:gap-6';

type PaymentTile = {
  readonly file: string;
  readonly chipWidthClass: string;
  readonly imgWidth: number;
  readonly imgHeight: number;
};

const PAYMENT_TILES: readonly PaymentTile[] = [
  { file: 'idram', chipWidthClass: 'w-[84px]', imgWidth: 76, imgHeight: 20 },
  { file: 'fastshift', chipWidthClass: 'w-[84px]', imgWidth: 72, imgHeight: 19 },
  { file: 'arca', chipWidthClass: 'w-[72px]', imgWidth: 66, imgHeight: 17 },
  { file: 'visa', chipWidthClass: 'w-[56px]', imgWidth: 36, imgHeight: 16 },
];

function resolvePaymentLogoSrc(file: string): string {
  const mapped: Record<string, string> = {
    idram: PAYMENT_ICON_SRC.idram,
    arca: '/images/footer/payments/arca.png',
    visa: PAYMENT_ICON_SRC.visa,
    fastshift: `${FOOTER_PAYMENT_IMAGE_BASE}/fastshift.png`,
  };
  return mapped[file] ?? `${FOOTER_PAYMENT_IMAGE_BASE}/${file}.webp`;
}

function PaymentLogoChip({ tile }: { tile: PaymentTile }) {
  const src = resolvePaymentLogoSrc(tile.file);
  return (
    <div
      className={`flex ${tile.chipWidthClass} shrink-0 items-center justify-center overflow-hidden`}
      style={{ height: PAYMENT_CHIP_HEIGHT_PX }}
    >
      <Image
        src={src}
        alt=""
        width={tile.imgWidth}
        height={tile.imgHeight}
        className="max-h-full w-auto object-contain"
        unoptimized={src.endsWith('.png')}
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
