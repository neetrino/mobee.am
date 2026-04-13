'use client';

import { useRouter } from 'next/navigation';
import { useTranslation } from '../../../../lib/i18n-client';

export function AnalyticsHeader() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <div className="mb-8">
      <button
        onClick={() => router.push('/admin')}
        className="text-gray-600 hover:text-gray-900 mb-4 flex items-center transition-colors duration-200 group"
      >
        <svg className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        {t('admin.analytics.backToAdmin')}
      </button>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{t('admin.analytics.title')}</h1>
          <p className="text-gray-600">{t('admin.analytics.subtitle')}</p>
        </div>
      </div>
    </div>
  );
}




