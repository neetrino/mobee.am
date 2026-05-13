'use client';

import { useTranslation } from '../../../../lib/i18n-client';

interface ProductDiscountsPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function getPaginationPages(totalPages: number, current: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const set = new Set<number>([1, totalPages, current - 1, current, current + 1]);
  const sorted = Array.from(set).filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out: (number | 'ellipsis')[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i]! - sorted[i - 1]! > 1) {
      out.push('ellipsis');
    }
    out.push(sorted[i]!);
  }
  return out;
}

const PAGINATION_ACTIVE_CLASS =
  'inline-flex h-10 min-w-10 items-center justify-center rounded-[9999px] bg-[#2DB2FF] px-3 text-sm font-semibold text-white';
const PAGINATION_PAGE_CLASS =
  'inline-flex h-10 min-w-10 cursor-pointer items-center justify-center rounded-[9999px] border border-transparent px-3 text-sm font-medium text-[#0F172B] transition-colors hover:border-[#d8dbe1] hover:bg-[#f6f7f9]';
const PAGINATION_NAV_CLASS =
  'inline-flex h-10 items-center justify-center rounded-[9999px] border border-transparent px-4 text-sm font-medium transition-colors';
const PAGINATION_NAV_ENABLED_CLASS = `${PAGINATION_NAV_CLASS} cursor-pointer text-[#0F172B] hover:border-[#d8dbe1] hover:bg-[#f6f7f9]`;
const PAGINATION_NAV_DISABLED_CLASS = `${PAGINATION_NAV_CLASS} cursor-default text-[#9AA4B2]`;

/**
 * Mobee shop-style pill pagination (matches public catalog / Figma mobee-new).
 */
export function ProductDiscountsPagination({
  page,
  totalPages,
  onPageChange,
}: ProductDiscountsPaginationProps) {
  const { t } = useTranslation();

  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav
      className="mt-8 flex w-full items-center justify-center"
      aria-label={t('common.pagination.ariaLabel')}
    >
      <div className="inline-flex max-w-full flex-wrap items-center justify-center gap-2 rounded-[9999px] px-2 py-2 sm:px-3">
        {page > 1 ? (
          <button
            type="button"
            className={PAGINATION_NAV_ENABLED_CLASS}
            onClick={() => onPageChange(page - 1)}
          >
            {t('common.pagination.previous')}
          </button>
        ) : (
          <span className={PAGINATION_NAV_DISABLED_CLASS}>{t('common.pagination.previous')}</span>
        )}

        <div className="mx-1 h-6 w-px bg-[#E2E8F0]" aria-hidden />

        {getPaginationPages(totalPages, page).map((item, idx) =>
          item === 'ellipsis' ? (
            <span
              key={`ellipsis-${idx}`}
              className="inline-flex h-10 min-w-10 items-center justify-center text-sm font-medium text-[#9AA4B2]"
              aria-hidden
            >
              ...
            </span>
          ) : item === page ? (
            <span key={item} className={PAGINATION_ACTIVE_CLASS} aria-current="page">
              {item}
            </span>
          ) : (
            <button key={item} type="button" className={PAGINATION_PAGE_CLASS} onClick={() => onPageChange(item)}>
              {item}
            </button>
          ),
        )}

        <div className="mx-1 h-6 w-px bg-[#E2E8F0]" aria-hidden />

        {page < totalPages ? (
          <button
            type="button"
            className={PAGINATION_NAV_ENABLED_CLASS}
            onClick={() => onPageChange(page + 1)}
          >
            {t('common.pagination.next')}
          </button>
        ) : (
          <span className={PAGINATION_NAV_DISABLED_CLASS}>{t('common.pagination.next')}</span>
        )}
      </div>
    </nav>
  );
}
