'use client';

import { useTranslation } from '../../../../lib/i18n-client';

export function CategoriesHeader() {
  const { t } = useTranslation();

  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-gray-900">{t('admin.categories.title')}</h1>
    </div>
  );
}
