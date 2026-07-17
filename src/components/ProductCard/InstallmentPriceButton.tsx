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
    label: 'text-xs leading-tight sm:leading-none',
  },
  md: {
    button: 'gap-2',
    icon: 16,
    label: 'text-sm leading-tight sm:leading-normal',
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
}: InstallmentPriceButtonProps) {
  const { t } = useTranslation();
  const styles = SIZE_STYLES[size];
  const buttonLabel = t('product.aparik.buttonLabel');
  const { line1, line2 } = splitButtonLabel(buttonLabel);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex shrink-0 items-center justify-center font-medium text-[#2db2ff] transition-colors hover:text-[#2db2ff] ${styles.button} ${className}`}
      aria-label={buttonLabel}
    >
      <Calculator size={styles.icon} strokeWidth={2} aria-hidden className="shrink-0" />
      <span
        className={`text-left no-underline group-hover:underline group-hover:decoration-[#2db2ff] group-hover:underline-offset-2 max-sm:inline-flex max-sm:flex-col max-sm:items-start sm:whitespace-nowrap ${styles.label}`}
      >
        <span>{line1}</span>
        {line2 ? (
          <>
            <span className="max-sm:hidden"> </span>
            <span>{line2}</span>
          </>
        ) : null}
      </span>
    </button>
  );
}
