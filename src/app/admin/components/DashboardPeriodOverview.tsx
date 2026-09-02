'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api-client';
import { useTranslation } from '../../../lib/i18n-client';
import { formatCurrency } from '../utils/dashboardUtils';
import {
  ADMIN_DASH_CARD_CLASS,
  ADMIN_DASH_CARD_HOVER_CLASS,
} from '../dashboard-ui.constants';
import type { AnalyticsData } from '../analytics/types';

type PeriodKey = 'day' | 'week' | 'month' | 'year';

interface PeriodSnapshot {
  period: PeriodKey;
  orderCount: number;
  revenueAmount: number;
  averageOrderValue: number;
  currency: string;
}

const PERIODS: PeriodKey[] = ['day', 'week', 'month', 'year'];

function averageOrderValue(revenue: number, orders: number): number {
  if (orders <= 0) {
    return 0;
  }
  return Math.round((revenue / orders) * 100) / 100;
}

interface DashboardPeriodOverviewProps {
  enabled: boolean;
  showAnalyticsLink?: boolean;
}

export function DashboardPeriodOverview({
  enabled,
  showAnalyticsLink = true,
}: DashboardPeriodOverviewProps) {
  const { t } = useTranslation();
  const [snapshots, setSnapshots] = useState<PeriodSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const results = await Promise.all(
          PERIODS.map((period) =>
            apiClient.get<AnalyticsData>('/api/v1/admin/analytics', {
              params: { period },
            }),
          ),
        );

        if (cancelled) {
          return;
        }

        setSnapshots(
          results.map((data, index) => {
            const period = PERIODS[index] ?? 'week';
            const orderCount = data.orders.totalOrders;
            const revenueAmount = data.orders.totalRevenue;
            return {
              period,
              orderCount,
              revenueAmount,
              averageOrderValue: averageOrderValue(revenueAmount, orderCount),
              currency: data.orders.currency,
            };
          }),
        );
      } catch {
        if (!cancelled) {
          setSnapshots([]);
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
  }, [enabled]);

  const periodTitle = (period: PeriodKey): string => {
    switch (period) {
      case 'day':
        return t('admin.dashboard.periodToday');
      case 'week':
        return t('admin.dashboard.periodWeek');
      case 'month':
        return t('admin.dashboard.periodMonth');
      case 'year':
        return t('admin.dashboard.periodYear');
    }
  };

  return (
    <div className="mb-3">
      <div className="mb-2 flex items-end justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          {t('admin.dashboard.periodsTitle')}
        </h2>
        {showAnalyticsLink ? (
          <Link
            href="/supersudo/analytics"
            className="text-xs font-medium text-admin-600 hover:underline"
          >
            {t('admin.dashboard.viewAnalytics')}
          </Link>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {loading
          ? PERIODS.map((period) => (
              <div key={period} className={`${ADMIN_DASH_CARD_CLASS} px-3.5 py-3`}>
                <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
                <div className="mt-3 h-7 w-24 animate-pulse rounded bg-gray-200" />
                <div className="mt-3 h-10 animate-pulse rounded bg-gray-100" />
              </div>
            ))
          : snapshots.map((snapshot) => (
              <div
                key={snapshot.period}
                className={`${ADMIN_DASH_CARD_CLASS} ${ADMIN_DASH_CARD_HOVER_CLASS} px-3.5 py-3`}
              >
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {periodTitle(snapshot.period)}
                </p>
                <p className="text-xl font-bold leading-none text-gray-900">
                  {formatCurrency(snapshot.revenueAmount, snapshot.currency)}
                </p>
                <p className="mt-1 text-xs text-gray-500">{t('admin.dashboard.chartRevenue')}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-gray-100 pt-2.5">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{snapshot.orderCount}</p>
                    <p className="text-[11px] text-gray-500">{t('admin.dashboard.chartOrders')}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(snapshot.averageOrderValue, snapshot.currency)}
                    </p>
                    <p className="text-[11px] text-gray-500">{t('admin.dashboard.aov')}</p>
                  </div>
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}
