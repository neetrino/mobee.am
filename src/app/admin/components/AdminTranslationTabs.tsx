'use client';

import {
  ADMIN_CONTENT_LOCALES,
  ADMIN_CONTENT_LOCALE_FULL_LABELS,
  type AdminContentLocale,
} from '@/lib/admin/admin-content-locale';
import { useTranslation } from '@/lib/i18n-client';

interface AdminTranslationTabsProps {
  value: AdminContentLocale;
  onChange: (locale: AdminContentLocale) => void;
  className?: string;
}

/**
 * Form-level translation language tabs (Հայերեն / English / Русский).
 * Switches only localizable fields — not the admin UI language.
 */
export function AdminTranslationTabs({
  value,
  onChange,
  className = '',
}: AdminTranslationTabsProps) {
  const { t } = useTranslation();

  return (
    <div className={className}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {t('admin.common.translations')}
      </p>
      <div
        className="inline-flex flex-wrap gap-1 rounded-supersudo border border-gray-200 bg-gray-50 p-1"
        role="tablist"
        aria-label={t('admin.common.translations')}
      >
        {ADMIN_CONTENT_LOCALES.map((locale) => {
          const isActive = locale === value;
          return (
            <button
              key={locale}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(locale)}
              className={`rounded-supersudo px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-admin-500 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-white hover:text-gray-900'
              }`}
            >
              {ADMIN_CONTENT_LOCALE_FULL_LABELS[locale]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
