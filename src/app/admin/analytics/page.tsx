'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth/AuthContext';
import { Card } from '@/app/admin/lib/adminShopUi';
import { useTranslation } from '../../../lib/i18n-client';
import { useAnalytics } from './hooks/useAnalytics';
import { AnalyticsHeader } from './components/AnalyticsHeader';
import { AdminPageShell } from '../components/AdminPageShell';
import { PeriodSelector } from './components/PeriodSelector';
import { StatsCards } from './components/StatsCards';
import { TopProducts } from './components/TopProducts';
import { TopCategories } from './components/TopCategories';
import { OrdersByDayChart } from './components/OrdersByDayChart';

export default function AnalyticsPage() {
  const { t } = useTranslation();
  const { isLoggedIn, isAdmin, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
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

  useEffect(() => {
    if (!isLoading) {
      if (!isLoggedIn || !isAdmin) {
        router.push('/supersudo');
        return;
      }
    }
  }, [isLoggedIn, isAdmin, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-admin mx-auto mb-4"></div>
          <p className="text-gray-600">{t('admin.common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn || !isAdmin) {
    return null;
  }

  return (
    <AdminPageShell currentPath={pathname || '/supersudo/analytics'} router={router} t={t}>
      <div className="max-w-7xl">
        <AnalyticsHeader />

        <PeriodSelector
          period={period}
          startDate={startDate}
          endDate={endDate}
          analytics={analytics}
          onPeriodChange={setPeriod}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
        />

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-admin mx-auto mb-4"></div>
            <p className="text-gray-600">{t('admin.analytics.loadingAnalytics')}</p>
          </div>
        ) : analytics ? (
          <>
            <StatsCards analytics={analytics} totalUsers={totalUsers} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <TopProducts products={analytics.topProducts} currency={analytics.orders.currency} />
              <TopCategories categories={analytics.topCategories} currency={analytics.orders.currency} />
            </div>

            <OrdersByDayChart ordersByDay={analytics.ordersByDay} currency={analytics.orders.currency} />
          </>
        ) : (
          <Card className="p-6">
            <p className="text-gray-600 text-center">{t('admin.analytics.noAnalyticsData')}</p>
          </Card>
        )}
      </div>
    </AdminPageShell>
  );
}
