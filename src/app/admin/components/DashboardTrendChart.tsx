'use client';

import { useEffect, useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { apiClient } from '../../../lib/api-client';
import { useTranslation } from '../../../lib/i18n-client';
import { LineChart } from '../analytics/LineChart';
import { formatCurrency } from '../utils/dashboardUtils';
import {
  ADMIN_DASH_CARD_CLASS,
  ADMIN_DASH_CARD_HOVER_CLASS,
  ADMIN_DASH_TONE,
} from '../dashboard-ui.constants';
import type { AnalyticsData } from '../analytics/types';

type ChartRange = 'month' | 'year';

interface DashboardTrendChartProps {
  enabled: boolean;
}

function StackStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: keyof typeof ADMIN_DASH_TONE;
}) {
  return (
    <div className={`rounded-[12px] px-3.5 py-3 ring-1 ${ADMIN_DASH_TONE[tone]} ${ADMIN_DASH_CARD_HOVER_CLASS}`}>
      <p className="text-[11px] font-medium text-gray-500">{label}</p>
      <p className="mt-1 break-words text-base font-bold leading-snug text-gray-900">{value}</p>
    </div>
  );
}

export function DashboardTrendChart({ enabled }: DashboardTrendChartProps) {
  const { t } = useTranslation();
  const [chart, setChart] = useState<ChartRange>('month');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get<AnalyticsData>('/api/v1/admin/analytics', {
          params: { period: chart },
        });
        if (!cancelled) {
          setData(response);
        }
      } catch {
        if (!cancelled) {
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [enabled, chart]);

  const totals = useMemo(() => {
    const points = data?.ordersByDay ?? [];
    const totalRevenue = points.reduce((sum, point) => sum + point.revenue, 0);
    const totalOrders = points.reduce((sum, point) => sum + point.count, 0);
    const aov = totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0;
    return { totalRevenue, totalOrders, aov, currency: data?.orders.currency ?? 'AMD' };
  }, [data]);

  const isEmpty = !data || data.ordersByDay.length === 0;

  return (
    <div className={`mb-3 ${ADMIN_DASH_CARD_CLASS} p-4`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-admin-100 text-admin-700">
            <TrendingUp className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900">{t('admin.dashboard.chartTitle')}</h2>
            <p className="text-xs text-gray-500">{t('admin.dashboard.chartSubtitle')}</p>
          </div>
        </div>

        <div
          className="relative inline-grid grid-cols-2 rounded-[12px] bg-gray-100 p-0.5"
          role="tablist"
          aria-label={t('admin.dashboard.chartRangeLabel')}
        >
          <span
            aria-hidden
            className={`pointer-events-none absolute top-0.5 bottom-0.5 left-0.5 w-[calc(50%-0.125rem)] rounded-[10px] bg-white shadow-sm ring-1 ring-gray-100 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none ${
              chart === 'year' ? 'translate-x-full' : ''
            }`}
          />
          {([
            { value: 'month' as const, label: t('admin.dashboard.chartRange6Months') },
            { value: 'year' as const, label: t('admin.dashboard.chartRangeYear') },
          ]).map((option) => {
            const active = option.value === chart;
            return (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setChart(option.value)}
                className={`relative z-[1] rounded-[10px] px-2.5 py-1 text-center text-xs font-semibold transition-colors duration-300 ${
                  active ? 'text-gray-900' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="h-56 animate-pulse rounded-[12px] bg-gray-100" />
      ) : isEmpty ? (
        <p className="py-10 text-center text-sm text-gray-500">{t('admin.dashboard.chartEmpty')}</p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-stretch">
          <div className="flex min-w-0 flex-col items-center justify-center rounded-[12px] bg-gradient-to-b from-gray-50 to-white p-3 ring-1 ring-gray-100/80">
            <LineChart
              data={data?.ordersByDay ?? []}
              currency={totals.currency}
              chartAria={t('admin.dashboard.chartTitle')}
              tooltip={{
                revenueLabel: t('admin.dashboard.chartRevenue'),
                ordersLabel: t('admin.dashboard.chartOrders'),
                formatRevenue: (amount) => formatCurrency(amount, totals.currency),
                formatOrders: (count) => String(count),
              }}
            />
            <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-[11px] text-gray-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-admin-500" />
                {t('admin.dashboard.chartRevenue')}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                {t('admin.dashboard.chartOrders')}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <StackStat
              label={t('admin.dashboard.chartRevenue')}
              value={formatCurrency(totals.totalRevenue, totals.currency)}
              tone="primary"
            />
            <StackStat
              label={t('admin.dashboard.chartOrders')}
              value={String(totals.totalOrders)}
              tone="accent"
            />
            <StackStat
              label={t('admin.dashboard.aov')}
              value={formatCurrency(totals.aov, totals.currency)}
              tone="ink"
            />
          </div>
        </div>
      )}
    </div>
  );
}
