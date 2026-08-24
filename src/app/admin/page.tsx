'use client';

import { StatsGrid } from './components/StatsGrid';
import { RecentOrdersCard } from './components/RecentOrdersCard';
import { TopProductsCard } from './components/TopProductsCard';
import { UserActivityCard } from './components/UserActivityCard';
import { QuickActionsCard } from './components/QuickActionsCard';
import { useAdminDashboard } from './hooks/useAdminDashboard';
import { useAdminPageNavDebug } from './hooks/useAdminPageNavDebug';
import { useAuth } from '../../lib/auth/AuthContext';

export default function AdminPanel() {
  const { isLoggedIn, isAdmin, isLoading } = useAuth();

  const {
    stats,
    recentOrders,
    topProducts,
    userActivity,
    statsLoading,
    recentOrdersLoading,
    topProductsLoading,
    userActivityLoading,
  } = useAdminDashboard({
    isLoggedIn,
    isAdmin,
    isLoading,
  });

  const dashboardLoading =
    statsLoading || recentOrdersLoading || topProductsLoading || userActivityLoading;
  useAdminPageNavDebug(dashboardLoading);

  return (
    <>
      <StatsGrid stats={stats} statsLoading={statsLoading} />

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RecentOrdersCard recentOrders={recentOrders} recentOrdersLoading={recentOrdersLoading} />
        <TopProductsCard topProducts={topProducts} topProductsLoading={topProductsLoading} />
      </div>

      <UserActivityCard userActivity={userActivity} userActivityLoading={userActivityLoading} />

      <QuickActionsCard />
    </>
  );
}
