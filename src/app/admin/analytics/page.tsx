'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Card } from '@/app/admin/lib/adminShopUi';
import { useTranslation } from '../../../lib/i18n-client';
import { AdminContentSkeleton } from '../components/AdminContentSkeleton';
import { DashboardPeriodOverview } from '../components/DashboardPeriodOverview';
import { useAnalytics } from './hooks/useAnalytics';
import { AnalyticsHeader } from './components/AnalyticsHeader';
import { PeriodSelector } from './components/PeriodSelector';
import { StatsCards } from './components/StatsCards';
import { useAuth } from '../../../lib/auth/AuthContext';
import { useAdminPageNavDebug } from '../hooks/useAdminPageNavDebug';

const TopProducts = dynamic(
  () => import('./components/TopProducts').then((module) => ({ default: module.TopProducts })),
  { loading: () => <AdminContentSkeleton lines={3} /> },
);

const TopCategories = dynamic(
  () => import('./components/TopCategories').then((module) => ({ default: module.TopCategories })),
  { loading: () => <AdminContentSkeleton lines={3} /> },
);

const OrdersByDayChart = dynamic(
  () => import('./components/OrdersByDayChart').then((module) => ({ default: module.OrdersByDayChart })),
  { loading: () => <AdminContentSkeleton lines={5} /> },
);

export default function AnalyticsPage() {
  const { t } = useTranslation();
  const { isLoggedIn, isAdmin } = useAuth();
  const [period, setPeriod] = useState<string>('week');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const { analytics, totalUsers, loading } = useAnalytics({
    period,
    startDate,
    endDate,
    isLoggedIn: isLoggedIn ?? false,
    isAdmin: isAdmin ?? false,
  });

  const showInitialLoading = loading && !analytics;
  const analyticsReady = Boolean(isLoggedIn && isAdmin);

  useAdminPageNavDebug(showInitialLoading);

  return (
    <section>
      <AnalyticsHeader />

      <DashboardPeriodOverview enabled={analyticsReady} showAnalyticsLink={false} />

      <PeriodSelector
        period={period}
        startDate={startDate}
        endDate={endDate}
        analytics={analytics}
        onPeriodChange={setPeriod}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
      />

      {showInitialLoading ? (
        <div className="space-y-3 py-6">
          <AdminContentSkeleton lines={2} />
          <AdminContentSkeleton lines={4} />
        </div>
      ) : analytics ? (
        <div className={loading ? 'opacity-80 transition-opacity' : ''}>
          <StatsCards analytics={analytics} totalUsers={totalUsers} />

          <OrdersByDayChart ordersByDay={analytics.ordersByDay} currency={analytics.orders.currency} />

          <div className="mb-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
            <TopProducts products={analytics.topProducts} currency={analytics.orders.currency} />
            <TopCategories categories={analytics.topCategories} currency={analytics.orders.currency} />
          </div>
        </div>
      ) : (
        <Card className="p-6">
          <p className="text-center text-gray-600">{t('admin.analytics.noAnalyticsData')}</p>
        </Card>
      )}
    </section>
  );
}
