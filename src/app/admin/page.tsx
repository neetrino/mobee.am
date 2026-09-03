'use client';

import { StatsGrid } from './components/StatsGrid';
import { RecentOrdersCard } from './components/RecentOrdersCard';
import { TopProductsCard } from './components/TopProductsCard';
import { QuickActionsCard } from './components/QuickActionsCard';
import { DashboardPeriodOverview } from './components/DashboardPeriodOverview';
import { DashboardTrendChart } from './components/DashboardTrendChart';
import { useAdminDashboard } from './hooks/useAdminDashboard';
import { useAdminPageNavDebug } from './hooks/useAdminPageNavDebug';
import { useAuth } from '../../lib/auth/AuthContext';
import { useTranslation } from '../../lib/i18n-client';

export default function AdminPanel() {
  const { t } = useTranslation();
  const { isLoggedIn, isAdmin, isLoading } = useAuth();

  const {
    stats,
    recentOrders,
    topProducts,
    statsLoading,
    recentOrdersLoading,
    topProductsLoading,
  } = useAdminDashboard({
    isLoggedIn,
    isAdmin,
    isLoading,
  });

  const dashboardReady = Boolean(isLoggedIn && isAdmin && !isLoading);
  const dashboardLoading = statsLoading || recentOrdersLoading || topProductsLoading;
  useAdminPageNavDebug(dashboardLoading);

  return (
    <section>
      <div className="mb-3">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          <span>{t('admin.dashboard.welcomeLead')} </span>
          <span>{t('admin.dashboard.welcomeAccent')}</span>
        </h1>
      </div>

      <StatsGrid stats={stats} statsLoading={statsLoading} />

      <DashboardPeriodOverview enabled={dashboardReady} />

      <DashboardTrendChart enabled={dashboardReady} />

      <div className="mb-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <RecentOrdersCard recentOrders={recentOrders} recentOrdersLoading={recentOrdersLoading} />
        <TopProductsCard topProducts={topProducts} topProductsLoading={topProductsLoading} />
      </div>

      <QuickActionsCard />
    </section>
  );
}
