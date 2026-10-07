'use client';

import { AdminSideSheet } from '../../components/AdminSideSheet';
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

/** Side sheet confirm for bulk order deletion. */
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
    <AdminSideSheet
      open={isOpen}
      onClose={onCancel}
      title={title}
      closeLabel={closeLabel}
      blockClose={bulkDeleting}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <Button type="button" variant="outline" className="w-full sm:w-auto" disabled={bulkDeleting} onClick={onCancel}>
            {t('admin.common.cancel')}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full border-red-200 text-red-700 hover:bg-red-50 sm:w-auto"
            disabled={bulkDeleting}
            onClick={onConfirm}
          >
            {bulkDeleting ? t('admin.orders.deleting') : t('admin.common.delete')}
          </Button>
        </div>
      }
    >
      <p className="text-sm leading-relaxed text-gray-600 sm:text-base">{confirmMessage}</p>
    </AdminSideSheet>
  );
}
