import { ChevronRight } from 'lucide-react';
import type { LanguageCode } from '@/lib/language';
import { isAffirmativeSpecValue } from '@/lib/products/product-spec-value-i18n';
import type { ProductDescriptionSpecRow } from '@/lib/products/extract-product-description-specs';
import { getProductSpecRowIcon, getProductSpecSectionIcon, getProductSpecSectionIconClassName } from './product-spec-row-icon';
import { PRODUCT_DESCRIPTION_CARD_CLASS } from './product-description.constants';

const ROW_CLASS =
  'flex items-center gap-3 border-b border-gray-100 py-3.5 last:border-b-0 last:pb-0 first:pt-0';

interface ProductSpecRowProps {
  row: ProductDescriptionSpecRow;
  language: LanguageCode;
  showChevron?: boolean;
}

export function ProductSpecRow({ row, language, showChevron = false }: ProductSpecRowProps) {
  const Icon = getProductSpecRowIcon(row.labelKey);
  const isPositive = isAffirmativeSpecValue(row.value, language);

  return (
    <div className={ROW_CLASS}>
      <Icon className="h-5 w-5 shrink-0 text-gray-400" aria-hidden />
      <span className="min-w-0 flex-1 text-sm text-gray-500">{row.label}</span>
      <span
        className={
          isPositive
            ? 'shrink-0 text-sm font-medium text-emerald-600'
            : 'shrink-0 text-right text-sm font-medium text-gray-900'
        }
      >
        {row.value}
      </span>
      {showChevron ? (
        <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
      ) : null}
    </div>
  );
}

interface ProductSpecCardProps {
  title: string;
  rows: ProductDescriptionSpecRow[];
  language: LanguageCode;
  sectionSlug: string;
  showChevrons?: boolean;
  className?: string;
}

export function ProductSpecCard({
  title,
  rows,
  language,
  sectionSlug,
  showChevrons = false,
  className = '',
}: ProductSpecCardProps) {
  if (rows.length === 0) {
    return null;
  }

  const SectionIcon = getProductSpecSectionIcon(sectionSlug);
  const sectionIconClassName = getProductSpecSectionIconClassName(sectionSlug);

  return (
    <article className={`${PRODUCT_DESCRIPTION_CARD_CLASS} ${className}`.trim()}>
      <header className="mb-4 flex items-center gap-2.5">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${sectionIconClassName}`}
        >
          <SectionIcon className="h-4 w-4" aria-hidden />
        </span>
        <h3 className="text-base font-bold text-gray-900">{title}</h3>
      </header>
      <div>
        {rows.map((row) => (
          <ProductSpecRow
            key={`${row.labelKey ?? row.label}-${row.value}`}
            row={row}
            language={language}
            showChevron={showChevrons}
          />
        ))}
      </div>
    </article>
  );
}
