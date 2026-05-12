'use client';

import { useTranslation } from '../../../../lib/i18n-client';

export function AnalyticsHeader() {
  const { t } = useTranslation();

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{t('admin.analytics.title')}</h1>
          <p className="text-gray-600">{t('admin.analytics.subtitle')}</p>
        </div>
      </div>
    </div>
  );
}
