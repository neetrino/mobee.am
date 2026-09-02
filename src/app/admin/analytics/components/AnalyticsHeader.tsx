'use client';

import { useTranslation } from '../../../../lib/i18n-client';

export function AnalyticsHeader() {
  const { t } = useTranslation();

  return (
    <div className="mb-3">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
        {t('admin.analytics.title')}
      </h1>
    </div>
  );
}
