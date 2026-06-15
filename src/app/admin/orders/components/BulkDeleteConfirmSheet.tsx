'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from '../../../../lib/i18n-client';
import { useAnimatedModalDismiss } from '../../../../lib/useAnimatedModalDismiss';
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
  const [isMounted, setIsMounted] = useState(false);

  const {
    isVisible,
    requestClose,
    handlePanelAnimationEnd,
    backdropMotionClass,
    panelMotionClass,
  } = useAnimatedModalDismiss({
    isOpen,
    onClose: onCancel,
    blockClose: bulkDeleting,
    lockBodyScroll: true,
    panelMotionVariant: 'dialog',
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isVisible || !isMounted) {
    return null;
  }

  const confirmMessage = t('admin.orders.deleteConfirm').replace('{count}', String(selectedCount));

  const modal = (
    <div className="fixed inset-0 z-[110]">
      <button
        type="button"
        className={`absolute inset-0 bg-black/50 ${backdropMotionClass} ${bulkDeleting ? 'pointer-events-none cursor-wait' : ''}`}
        aria-label={closeLabel}
        onClick={() => {
          if (!bulkDeleting) {
            requestClose();
          }
        }}
      />
      <div className="fixed left-1/2 top-1/2 z-10 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 px-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-delete-sheet-title"
          className={`flex w-full flex-col overflow-hidden rounded-[20px] border border-admin-100 bg-white shadow-2xl ${panelMotionClass}`}
          onClick={(e) => e.stopPropagation()}
          onAnimationEnd={handlePanelAnimationEnd}
        >
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
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
