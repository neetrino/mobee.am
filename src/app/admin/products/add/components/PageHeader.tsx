'use client';

import { useTranslation } from '../../../../../lib/i18n-client';

interface PageHeaderProps {
  isEditMode: boolean;
}

export function PageHeader({ isEditMode }: PageHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-gray-900">
        {isEditMode ? t('admin.products.add.editProduct') : t('admin.products.add.addNewProduct')}
      </h1>
    </div>
  );
}
