'use client';

import type { MouseEvent } from 'react';
import { Calculator } from 'lucide-react';
import { useTranslation } from '../../lib/i18n-client';

interface InstallmentPriceButtonProps {
  onClick: (event: MouseEvent) => void;
  className?: string;
  /** `md` matches PDP secondary links (e.g. «Ավելի մանրամասն»). */
  size?: 'sm' | 'md';
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
}: InstallmentPriceButtonProps) {
  const { t } = useTranslation();
  const styles = SIZE_STYLES[size];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex shrink-0 items-center justify-center font-medium text-[#2db2ff] transition-colors hover:text-[#2db2ff] ${styles.button} ${className}`}
      aria-label={t('product.aparik.buttonLabel')}
    >
      <Calculator size={styles.icon} strokeWidth={2} aria-hidden className="shrink-0" />
      <span
        className={`whitespace-nowrap no-underline group-hover:underline group-hover:decoration-[#2db2ff] group-hover:underline-offset-2 ${styles.label}`}
      >
        {t('product.aparik.buttonLabel')}
      </span>
    </button>
  );
}
