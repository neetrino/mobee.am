'use client';

import { useEffect } from 'react';
import { useTranslation } from '../../../../lib/i18n-client';
import { acquireBodyScrollLock } from '../../../../lib/body-scroll-lock';
import { Button } from '@/app/admin/lib/adminShopUi';

export interface BulkDeleteConfirmSheetProps {
  isOpen: boolean;
  title: string;
  closeLabel: string;
  selectedCount: number;
  bulkDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Bottom sheet shell aligned with profile mobile section modal (always anchored to the bottom).
 */
export function BulkDeleteConfirmSheet({
  isOpen,
  title,
  closeLabel,
  selectedCount,
  bulkDeleting,
  onCancel,
  onConfirm,
}: BulkDeleteConfirmSheetProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    return acquireBodyScrollLock();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !bulkDeleting) {
        onCancel();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, bulkDeleting, onCancel]);

  if (!isOpen) {
    return null;
  }

  const confirmMessage = t('admin.orders.deleteConfirm').replace('{count}', String(selectedCount));

  return (
    <div className="fixed inset-0 z-[90] flex flex-col justify-end sm:p-4 sm:pb-10">
      <button
        type="button"
        className={`absolute inset-0 bg-black/50 ${bulkDeleting ? 'pointer-events-none cursor-wait' : ''}`}
        aria-label={closeLabel}
        onClick={() => {
          if (!bulkDeleting) {
            onCancel();
          }
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-delete-sheet-title"
        className="relative z-10 mx-auto flex max-h-[min(92dvh,900px)] w-full max-w-lg flex-col overflow-hidden rounded-t-[20px] border border-admin-100 bg-white pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-[20px] sm:pb-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-admin-100 px-4 py-3 sm:px-5">
          <h2 id="bulk-delete-sheet-title" className="min-w-0 truncate text-lg font-semibold text-gray-900">
            {title}
          </h2>
          <button
            type="button"
            disabled={bulkDeleting}
            onClick={onCancel}
            className="shrink-0 rounded-full p-2 text-gray-500 transition-colors hover:bg-admin-50 hover:text-admin-700 focus:outline-none focus:ring-2 focus:ring-admin-400 disabled:pointer-events-none disabled:opacity-40"
            aria-label={closeLabel}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">
          <p className="text-sm leading-relaxed text-gray-600 sm:text-base">{confirmMessage}</p>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:mt-8 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              disabled={bulkDeleting}
              onClick={onCancel}
            >
              {t('admin.common.cancel')}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full border-red-200 text-red-700 hover:bg-red-50 sm:w-auto"
              disabled={bulkDeleting}
              onClick={() => {
                onConfirm();
              }}
            >
              {bulkDeleting ? t('admin.orders.deleting') : t('admin.common.delete')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
