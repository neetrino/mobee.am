'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../lib/auth/AuthContext';
import { useTranslation } from '../../lib/i18n-client';
import { AdminSidebar } from './components/AdminSidebar';
import { StatsGrid } from './components/StatsGrid';
import { RecentOrdersCard } from './components/RecentOrdersCard';
import { TopProductsCard } from './components/TopProductsCard';
import { UserActivityCard } from './components/UserActivityCard';
import { QuickActionsCard } from './components/QuickActionsCard';
import { useAdminDashboard } from './hooks/useAdminDashboard';

export default function AdminPanel() {
  const { t } = useTranslation();
  const { isLoggedIn, isAdmin, isLoading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

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

  useEffect(() => {
    if (!isLoading) {
      if (!isLoggedIn) {
        console.log('❌ [ADMIN] User not logged in, redirecting to login...');
        router.push('/login');
        return;
      }
      if (!isAdmin) {
        console.log('❌ [ADMIN] User is not admin, redirecting to home...');
        router.push('/');
        return;
      }
    }
  }, [isLoggedIn, isAdmin, isLoading, router]);

  const [currentPath, setCurrentPath] = useState(pathname || '/admin');

  useEffect(() => {
    if (pathname) {
      setCurrentPath(pathname);
    }
  }, [pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('admin.common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('admin.dashboard.title')}</h1>
          <p className="text-gray-600 mt-2">
            {t('admin.dashboard.welcome').replace('{name}', user?.firstName || t('admin.dashboard.title'))}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <AdminSidebar currentPath={currentPath} router={router} t={t} />

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <StatsGrid stats={stats} statsLoading={statsLoading} />

            {/* Dashboard Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <RecentOrdersCard recentOrders={recentOrders} recentOrdersLoading={recentOrdersLoading} />
              <TopProductsCard topProducts={topProducts} topProductsLoading={topProductsLoading} />
            </div>

            <UserActivityCard userActivity={userActivity} userActivityLoading={userActivityLoading} />

            <QuickActionsCard />
          </div>
        </div>
      </div>
    </div>
  );
}
