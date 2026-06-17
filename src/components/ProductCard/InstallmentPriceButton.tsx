'use client';

import type { MouseEvent } from 'react';
import { Calculator } from 'lucide-react';
import { ProductCardInstallmentExchangeIcon } from '../icons/ProductCardInstallmentExchangeIcon';
import { useTranslation } from '../../lib/i18n-client';

interface InstallmentPriceButtonProps {
  onClick: (event: MouseEvent) => void;
  className?: string;
  /** `md` matches PDP secondary links (e.g. «Ավելի մանրամասն»). */
  size?: 'sm' | 'md';
  /** Home mobile Figma card — outlined pill with exchange icon. */
  variant?: 'text' | 'homeMobilePill';
}

const SIZE_STYLES = {
  sm: {
    button: 'gap-1.5',
    icon: 18,
    label: 'text-xs leading-none',
  },
  md: {
    button: 'gap-2',
    icon: 16,
    label: 'text-sm',
  },
} as const;

export function InstallmentPriceButton({
  onClick,
  className = '',
  size = 'sm',
  variant = 'text',
}: InstallmentPriceButtonProps) {
  const { t } = useTranslation();
  const styles = SIZE_STYLES[size];
  const label = t('product.aparik.buttonLabel');

  if (variant === 'homeMobilePill') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex h-9 w-[153px] shrink-0 items-center justify-center gap-1.5 rounded-[40px] border-2 border-[#2db2ff] bg-transparent pl-2.5 pr-[13px] py-1.5 text-sm font-medium text-[#2db2ff] transition-opacity hover:opacity-90 ${className}`}
        aria-label={label}
      >
        <ProductCardInstallmentExchangeIcon size={24} className="shrink-0" />
        <span className="whitespace-nowrap">{label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex shrink-0 items-center justify-center font-medium text-[#2db2ff] transition-colors hover:text-[#2db2ff] ${styles.button} ${className}`}
      aria-label={label}
    >
      <Calculator size={styles.icon} strokeWidth={2} aria-hidden className="shrink-0" />
      <span
        className={`whitespace-nowrap no-underline group-hover:underline group-hover:decoration-[#2db2ff] group-hover:underline-offset-2 ${styles.label}`}
      >
        {label}
      </span>
    </button>
  );
}
