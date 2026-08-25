'use client';

import type { MouseEvent } from 'react';
import { Calculator } from 'lucide-react';
import { MoneyExchangeIcon } from '../icons/MoneyExchangeIcon';
import { useTranslation } from '../../lib/i18n-client';

interface InstallmentPriceButtonProps {
  onClick: (event: MouseEvent) => void;
  className?: string;
  /** `md` matches PDP secondary links (e.g. «Ավելի մանրամասն»). */
  size?: 'sm' | 'md';
  /** Force two-line label (e.g. related products desktop). */
  stackLabel?: boolean;
  /**
   * `link` — text + icon (PDP / legacy footer).
   * `pill` — outlined capsule (Figma product card 91:1325).
   */
  variant?: 'link' | 'pill';
}

const SIZE_STYLES = {
  sm: {
    button: 'gap-1.5',
    icon: 18,
    stackedLabelClass:
      'text-left text-xs leading-tight inline-flex flex-col items-start',
    responsiveLabelClass:
      'text-left text-xs leading-tight max-sm:inline-flex max-sm:flex-col max-sm:items-start sm:whitespace-nowrap sm:leading-none',
  },
  md: {
    button: 'gap-2',
    icon: 16,
    stackedLabelClass:
      'text-left text-sm leading-tight inline-flex flex-col items-start',
    /** PDP (incl. mobile): always one line. */
    responsiveLabelClass: 'whitespace-nowrap text-left text-sm leading-normal',
  },
} as const;

function splitButtonLabel(label: string): { line1: string; line2: string } {
  const spaceIndex = label.indexOf(' ');
  if (spaceIndex === -1) {
    return { line1: label, line2: '' };
  }
  return {
    line1: label.slice(0, spaceIndex),
    line2: label.slice(spaceIndex + 1),
  };
}

export function InstallmentPriceButton({
  onClick,
  className = '',
  size = 'sm',
  stackLabel = false,
  variant = 'link',
}: InstallmentPriceButtonProps) {
  const { t } = useTranslation();
  const styles = SIZE_STYLES[size];
  const buttonLabel = t('product.aparik.buttonLabel');
  const { line1, line2 } = splitButtonLabel(buttonLabel);

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex h-[38px] w-[120px] shrink-0 items-center gap-0.5 rounded-full border border-[#2db2ff] bg-transparent py-1 pl-2 pr-2.5 text-[#2db2ff] transition-opacity hover:opacity-90 max-lg:h-[34px] max-lg:w-auto max-lg:max-w-[110px] max-lg:px-1.5 ${className}`}
        aria-label={buttonLabel}
      >
        <MoneyExchangeIcon size={20} className="shrink-0 max-lg:size-[18px]" />
        <span className="min-w-0 flex-1 text-center text-xs font-medium leading-tight max-lg:text-[11px]">
          {buttonLabel}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex shrink-0 items-center justify-center font-medium text-[#2db2ff] transition-colors hover:text-[#2db2ff] ${styles.button} ${className}`}
      aria-label={buttonLabel}
    >
      <Calculator size={styles.icon} strokeWidth={2} aria-hidden className="shrink-0" />
      <span
        className={`no-underline group-hover:underline group-hover:decoration-[#2db2ff] group-hover:underline-offset-2 ${
          stackLabel ? styles.stackedLabelClass : styles.responsiveLabelClass
        }`}
      >
        <span>{line1}</span>
        {line2 ? (
          <>
            <span className={stackLabel ? 'hidden' : size === 'md' ? undefined : 'max-sm:hidden'}>
              {' '}
            </span>
            <span>{line2}</span>
          </>
        ) : null}
      </span>
    </button>
  );
}
