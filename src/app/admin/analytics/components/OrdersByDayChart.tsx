'use client';

import { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import { useTranslation } from '../../../../lib/i18n-client';
import { LineChart } from '../LineChart';
import { formatCurrency } from '../utils';
import type { AnalyticsData } from '../types';
import {
  ADMIN_DASH_CARD_CLASS,
  ADMIN_DASH_CARD_HOVER_CLASS,
  ADMIN_DASH_TONE,
} from '../../dashboard-ui.constants';

interface OrdersByDayChartProps {
  ordersByDay: AnalyticsData['ordersByDay'];
  currency: string;
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

export function OrdersByDayChart({ ordersByDay, currency }: OrdersByDayChartProps) {
  const { t } = useTranslation();

  const totals = useMemo(() => {
    const totalRevenue = ordersByDay.reduce((sum, day) => sum + day.revenue, 0);
    const totalOrders = ordersByDay.reduce((sum, day) => sum + day.count, 0);
    const aov = totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0;
    return { totalRevenue, totalOrders, aov };
  }, [ordersByDay]);

  return (
    <div className={`mb-3 ${ADMIN_DASH_CARD_CLASS} p-4`}>
      <div className="mb-3 flex min-w-0 items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-admin-100 text-admin-700">
          <TrendingUp className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-gray-900">{t('admin.analytics.ordersByDay')}</h2>
          <p className="text-xs text-gray-500">{t('admin.analytics.dailyOrderTrends')}</p>
        </div>
      </div>

      {ordersByDay.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-500">{t('admin.analytics.noDataAvailable')}</p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-stretch">
          <div className="flex min-w-0 flex-col items-center justify-center rounded-[12px] bg-gradient-to-b from-gray-50 to-white p-3 ring-1 ring-gray-100/80">
            <LineChart
              data={ordersByDay}
              currency={currency}
              chartAria={t('admin.analytics.ordersByDay')}
              tooltip={{
                revenueLabel: t('admin.analytics.totalRevenue'),
                ordersLabel: t('admin.analytics.totalOrders'),
                formatRevenue: (amount) => formatCurrency(amount, currency),
                formatOrders: (count) => String(count),
              }}
            />
            <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-[11px] text-gray-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-admin-500" />
                {t('admin.analytics.totalRevenue')}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                {t('admin.analytics.totalOrders')}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <StackStat
              label={t('admin.analytics.totalRevenue')}
              value={formatCurrency(totals.totalRevenue, currency)}
              tone="primary"
            />
            <StackStat
              label={t('admin.analytics.totalOrders')}
              value={String(totals.totalOrders)}
              tone="accent"
            />
            <StackStat
              label={t('admin.analytics.aov')}
              value={formatCurrency(totals.aov, currency)}
              tone="ink"
            />
          </div>
        </div>
      )}
    </div>
  );
}
