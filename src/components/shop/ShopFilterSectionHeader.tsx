'use client';

import { X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n-client';

type ShopFilterSectionHeaderProps = {
  title: string;
  showClear: boolean;
  onClear: () => void;
  titleClassName?: string;
  className?: string;
};

export function ShopFilterSectionHeader({
  title,
  showClear,
  onClear,
  titleClassName = 'text-base font-semibold leading-6 tracking-[-0.02em] text-[#1D293D]',
  className,
}: ShopFilterSectionHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className={`flex items-center justify-between gap-3${className ? ` ${className}` : ''}`}>
      <h3 className={`min-w-0 ${titleClassName}`}>{title}</h3>
      {showClear ? (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium leading-5 tracking-[-0.01em] text-[#2DB2FF] transition-colors hover:text-[#25A0E0]"
        >
          <X className="h-4 w-4" strokeWidth={2} aria-hidden />
          <span>{t('products.filters.clearSection')}</span>
        </button>
      ) : null}
    </div>
  );
}
