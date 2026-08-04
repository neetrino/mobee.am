'use client';

import Image from 'next/image';
import { useTranslation } from '../lib/i18n-client';
import { PAYMENT_ICON_SRC } from '../lib/constants/ui-icons.constants';

/** Figma mobee-new node 1:1509 — payment methods in footer legal bar. */
const PAYMENT_CHIP_HEIGHT_PX = 30;
const PAYMENT_CHIPS_ROW_LAYOUT_CLASS = 'flex flex-nowrap items-center gap-5 xl:gap-6';

type PaymentTile = {
  readonly key: keyof typeof PAYMENT_ICON_SRC;
  readonly chipWidthClass: string;
  readonly imgWidth: number;
  readonly imgHeight: number;
};

const PAYMENT_TILES: readonly PaymentTile[] = [
  { key: 'idram', chipWidthClass: 'w-[84px]', imgWidth: 76, imgHeight: 20 },
  { key: 'fastshift', chipWidthClass: 'w-[84px]', imgWidth: 72, imgHeight: 19 },
  { key: 'arca', chipWidthClass: 'w-[72px]', imgWidth: 66, imgHeight: 17 },
  { key: 'visa', chipWidthClass: 'w-[56px]', imgWidth: 36, imgHeight: 16 },
];

function PaymentLogoChip({ tile }: { tile: PaymentTile }) {
  return (
    <div
      className={`flex ${tile.chipWidthClass} shrink-0 items-center justify-center overflow-hidden`}
      style={{ height: PAYMENT_CHIP_HEIGHT_PX }}
    >
      <Image
        src={PAYMENT_ICON_SRC[tile.key]}
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
        <PaymentLogoChip key={tile.key} tile={tile} />
      ))}
    </div>
  );
}
