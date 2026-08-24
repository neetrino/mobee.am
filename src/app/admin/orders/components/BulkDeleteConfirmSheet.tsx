'use client';

import { AnimatedModalPortal } from '@/components/AnimatedModalPortal';
import { Button } from '@/app/admin/lib/adminShopUi';
import { useTranslation } from '../../../../lib/i18n-client';

export interface BulkDeleteConfirmSheetProps {
  isOpen: boolean;
  title: string;
  closeLabel: string;
  selectedCount: number;
  bulkDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Centered confirm dialog for bulk order deletion. */
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
  const confirmMessage = t('admin.orders.deleteConfirm').replace('{count}', String(selectedCount));

  return (
    <AnimatedModalPortal
      isOpen={isOpen}
      onClose={onCancel}
      closeAriaLabel={closeLabel}
      blockClose={bulkDeleting}
      labelledBy="bulk-delete-sheet-title"
      panelClassName="flex w-full flex-col overflow-hidden rounded-[20px] border border-admin-100 bg-white shadow-2xl"
    >
      {({ requestClose }) => (
        <>
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-admin-100 px-4 py-3 sm:px-5">
            <h2 id="bulk-delete-sheet-title" className="min-w-0 truncate text-lg font-semibold text-gray-900">
              {title}
            </h2>
            <button
              type="button"
              disabled={bulkDeleting}
              onClick={requestClose}
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
                onClick={requestClose}
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
        </>
      )}
    </AnimatedModalPortal>
  );
}
