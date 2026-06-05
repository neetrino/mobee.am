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
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 bg-white font-medium text-[#e91e63] transition-opacity hover:opacity-80 ${className}`}
      aria-label={t('product.aparik.buttonLabel')}
    >
      <Calculator size={18} strokeWidth={2.25} aria-hidden className="shrink-0" />
      <span className="whitespace-nowrap text-[11px] leading-none tracking-wide sm:text-xs">
        {t('product.aparik.buttonLabel')}
      </span>
    </button>
  );
}
