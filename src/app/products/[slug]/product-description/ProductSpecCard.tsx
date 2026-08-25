import { createElement } from 'react';
import type { LanguageCode } from '@/lib/language';
import { isAffirmativeSpecValue } from '@/lib/products/product-spec-value-i18n';
import type { ProductDescriptionSpecRow } from '@/lib/products/extract-product-description-specs';
import { getProductSpecRowIcon, getProductSpecSectionIcon, getProductSpecSectionIconClassName } from './product-spec-row-icon';
import { PRODUCT_DESCRIPTION_CARD_CLASS } from './product-description.constants';

const ROW_CLASS =
  'flex flex-wrap items-start gap-x-3 gap-y-1 border-b border-gray-100 py-3.5 last:border-b-0 last:pb-0 first:pt-0';

interface ProductSpecRowProps {
  row: ProductDescriptionSpecRow;
  language: LanguageCode;
}

export function ProductSpecRow({ row, language }: ProductSpecRowProps) {
  const isPositive = isAffirmativeSpecValue(row.value, language);

  return (
    <div className={ROW_CLASS}>
      {createElement(getProductSpecRowIcon(row.labelKey, row.label), {
        className: 'h-5 w-5 shrink-0 text-gray-400',
        'aria-hidden': true,
      })}
      <span className="min-w-0 flex-[1_1_8rem] break-words text-sm text-gray-500">
        {row.label}
      </span>
      <span
        className={
          isPositive
            ? 'min-w-0 max-w-full flex-[1_1_6rem] break-words text-sm font-medium text-emerald-600 sm:text-right'
            : 'min-w-0 max-w-full flex-[1_1_6rem] break-words text-sm font-medium text-gray-900 sm:text-right'
        }
      >
        {row.value}
      </span>
    </div>
  );
}

interface ProductSpecCardProps {
  title: string;
  rows: ProductDescriptionSpecRow[];
  language: LanguageCode;
  sectionSlug: string;
  className?: string;
}

export function ProductSpecCard({
  title,
  rows,
  language,
  sectionSlug,
  className = '',
}: ProductSpecCardProps) {
  if (rows.length === 0) {
    return null;
  }

  const sectionIconClassName = getProductSpecSectionIconClassName(sectionSlug);

  return (
    <article className={`${PRODUCT_DESCRIPTION_CARD_CLASS} ${className}`.trim()}>
      <header className="mb-4 flex items-center gap-2.5">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${sectionIconClassName}`}
        >
          {createElement(getProductSpecSectionIcon(sectionSlug), {
            className: 'h-4 w-4',
            'aria-hidden': true,
          })}
        </span>
        <h3 className="min-w-0 break-words text-base font-bold text-gray-900">{title}</h3>
      </header>
      <div>
        {rows.map((row) => (
          <ProductSpecRow
            key={`${row.labelKey ?? row.label}-${row.value}`}
            row={row}
            language={language}
          />
        ))}
      </div>
    </article>
  );
}
