'use client';

import {
  ADMIN_CONTENT_LOCALES,
  ADMIN_CONTENT_LOCALE_LABELS,
  type AdminContentLocale,
} from '@/lib/admin/admin-content-locale';
import { useTranslation } from '@/lib/i18n-client';

interface AdminLocaleSwitchProps {
  value: AdminContentLocale;
  onChange: (locale: AdminContentLocale) => void;
  className?: string;
  /** Optional hint under the switch (e.g. which fields are localized). */
  hint?: string;
}

/**
 * Segmented control to switch catalog content language (hy / en / ru).
 */
export function AdminLocaleSwitch({
  value,
  onChange,
  className = '',
  hint,
}: AdminLocaleSwitchProps) {
  const { t } = useTranslation();

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-700">
          {t('admin.common.contentLocale')}
        </span>
        <div
          className="inline-flex rounded-supersudo border border-gray-200 bg-gray-50 p-0.5"
          role="group"
          aria-label={t('admin.common.contentLocale')}
        >
          {ADMIN_CONTENT_LOCALES.map((locale) => {
            const isActive = locale === value;
            return (
              <button
                key={locale}
                type="button"
                onClick={() => onChange(locale)}
                className={`min-w-[3rem] rounded-supersudo px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-admin-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                aria-pressed={isActive}
              >
                {ADMIN_CONTENT_LOCALE_LABELS[locale]}
              </button>
            );
          })}
        </div>
      </div>
      {hint ? <p className="mt-1.5 text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
}
