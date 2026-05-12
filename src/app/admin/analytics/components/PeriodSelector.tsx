'use client';

import { Button, Card } from '@/app/admin/lib/adminShopUi';
import { useTranslation } from '../../../../lib/i18n-client';
import { formatDate } from '../utils';
import type { AnalyticsData } from '../types';

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

interface AnalyticsPeriodButtonGroupProps {
  period: string;
  onPeriodChange: (period: string) => void;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  t: (key: string) => string;
}

function AnalyticsPeriodButtonGroup({
  period,
  onPeriodChange,
  onStartDateChange,
  onEndDateChange,
  t,
}: AnalyticsPeriodButtonGroupProps) {
  return (
    <div className="w-full min-w-0">
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-labelledby="analytics-time-period-heading"
      >
        {ANALYTICS_PERIOD_OPTIONS.map((opt) => {
          const isSelected = period === opt.value;
          const focusRingClass = isSelected
            ? 'focus:ring-0 focus:ring-offset-0 focus-visible:ring-2 focus-visible:ring-white/90 focus-visible:ring-offset-2'
            : 'focus:ring-0 focus:ring-offset-0 focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2';

          return (
            <Button
              key={opt.value}
              type="button"
              size="sm"
              variant={isSelected ? 'admin' : 'outline'}
              className={focusRingClass}
              onClick={() => {
                onPeriodChange(opt.value);
                if (opt.value !== 'custom') {
                  onStartDateChange('');
                  onEndDateChange('');
                }
              }}
            >
              {t(opt.i18nKey)}
            </Button>
          );
        })}
      </div>
    </div>
  );
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
    <Card className="p-6 mb-6 bg-white shadow-sm border border-gray-200 rounded-supersudo">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <h2 id="analytics-time-period-heading" className="text-xl font-semibold text-gray-900">
          {t('admin.analytics.timePeriod')}
        </h2>
        {analytics && (
          <div className="text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-supersudo">
            {formatDate(analytics.dateRange.start)} - {formatDate(analytics.dateRange.end)}
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-3 items-end">
        <AnalyticsPeriodButtonGroup
          period={period}
          onPeriodChange={onPeriodChange}
          onStartDateChange={onStartDateChange}
          onEndDateChange={onEndDateChange}
          t={t}
        />
        {period === 'custom' && (
          <>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('admin.analytics.startDate')}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-supersudo focus:outline-none focus:ring-2 focus:ring-admin focus:border-admin transition-all bg-white"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('admin.analytics.endDate')}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => onEndDateChange(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-supersudo focus:outline-none focus:ring-2 focus:ring-admin focus:border-admin transition-all bg-white"
              />
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
