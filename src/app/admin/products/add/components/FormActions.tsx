'use client';

import { useContext } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/app/admin/lib/adminShopUi';
import { AdminSheetFooterSlotContext } from '../../../components/AdminSideSheet';
import { useTranslation } from '../../../../../lib/i18n-client';
import { useRouter } from 'next/navigation';

interface FormActionsProps {
  loading: boolean;
  isEditMode: boolean;
  isSnapshotReady?: boolean;
  onCancel?: () => void;
}

export function FormActions({ loading, isEditMode, isSnapshotReady = true, onCancel }: FormActionsProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const footerSlot = useContext(AdminSheetFooterSlotContext);

  const actions = (
    <div className="border-t border-gray-200 bg-white px-5 py-4">
      <div className="flex gap-3">
        <Button
          type="submit"
          form="admin-product-form"
          variant="admin"
          disabled={loading || (isEditMode && !isSnapshotReady)}
          className="flex-1 !bg-admin-500 !text-white shadow-sm hover:!bg-admin-600 focus:!ring-admin-400 focus:!ring-offset-2 border-0"
        >
          {loading
            ? isEditMode
              ? t('admin.products.add.updating')
              : t('admin.products.add.creating')
            : isEditMode
              ? t('admin.products.add.updateProduct')
              : t('admin.products.add.createProduct')}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => (onCancel ? onCancel() : router.push('/supersudo/products'))}
          className="shrink-0"
        >
          {t('admin.common.cancel')}
        </Button>
      </div>
    </div>
  );

  if (footerSlot) {
    return createPortal(actions, footerSlot);
  }

  return actions;
}


