'use client';

import { CalendarRange } from 'lucide-react';
import { useTranslation } from '../../../../lib/i18n-client';
import { formatDate } from '../utils';
import type { AnalyticsData } from '../types';
import { ADMIN_DASH_CARD_CLASS } from '../../dashboard-ui.constants';

const ANALYTICS_PERIOD_OPTIONS = [
  { value: 'day', i18nKey: 'admin.analytics.today' },
  { value: 'week', i18nKey: 'admin.analytics.last7Days' },
  { value: 'month', i18nKey: 'admin.analytics.last30Days' },
  { value: 'year', i18nKey: 'admin.analytics.lastYear' },
  { value: 'custom', i18nKey: 'admin.analytics.customRange' },
] as const;

interface PeriodSelectorProps {
  period: string;
  startDate: string;
  endDate: string;
  analytics: AnalyticsData | null;
  onPeriodChange: (period: string) => void;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

export function PeriodSelector({
  period,
  startDate,
  endDate,
  analytics,
  onPeriodChange,
  onStartDateChange,
  onEndDateChange,
}: PeriodSelectorProps) {
  const { t } = useTranslation();

  return (
    <div className={`mb-3 ${ADMIN_DASH_CARD_CLASS} p-4`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-900">
            <CalendarRange className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900">{t('admin.analytics.timePeriod')}</h2>
            {analytics ? (
              <p className="text-xs text-gray-500">
                {formatDate(analytics.dateRange.start)} – {formatDate(analytics.dateRange.end)}
              </p>
            ) : (
              <p className="text-xs text-gray-500">{t('admin.analytics.period')}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label={t('admin.analytics.timePeriod')}>
        {ANALYTICS_PERIOD_OPTIONS.map((opt) => {
          const isSelected = period === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onPeriodChange(opt.value);
                if (opt.value !== 'custom') {
                  onStartDateChange('');
                  onEndDateChange('');
                }
              }}
              className={`rounded-[10px] px-3 py-1.5 text-xs font-semibold transition ${
                isSelected
                  ? 'bg-admin-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t(opt.i18nKey)}
            </button>
          );
        })}
      </div>

      {period === 'custom' ? (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="min-w-[120px] flex-1 text-xs font-medium text-gray-600">
            {t('admin.analytics.startDate')}
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="mt-1 h-10 w-full rounded-[12px] border border-gray-200 px-3 text-sm text-gray-900 outline-none focus:border-admin-400 focus:ring-2 focus:ring-admin-100"
            />
          </label>
          <label className="min-w-[120px] flex-1 text-xs font-medium text-gray-600">
            {t('admin.analytics.endDate')}
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="mt-1 h-10 w-full rounded-[12px] border border-gray-200 px-3 text-sm text-gray-900 outline-none focus:border-admin-400 focus:ring-2 focus:ring-admin-100"
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
