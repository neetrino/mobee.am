'use client';

import type { MouseEvent } from 'react';
import { Calculator } from 'lucide-react';
import { useTranslation } from '../../lib/i18n-client';

interface InstallmentPriceButtonProps {
  onClick: (event: MouseEvent) => void;
  className?: string;
}

export function InstallmentPriceButton({ onClick, className = '' }: InstallmentPriceButtonProps) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex shrink-0 items-center justify-center gap-1.5 font-medium text-[#2db2ff] transition-colors hover:text-[#2db2ff] ${className}`}
      aria-label={t('product.aparik.buttonLabel')}
    >
      <Calculator size={18} strokeWidth={2} aria-hidden className="shrink-0" />
      <span className="whitespace-nowrap text-xs leading-none no-underline group-hover:underline group-hover:decoration-[#2db2ff] group-hover:underline-offset-2">
        {t('product.aparik.buttonLabel')}
      </span>
    </button>
  );
}
