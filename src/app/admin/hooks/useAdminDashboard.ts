/**
 * Hook for admin dashboard data fetching
 */

import { useMemo } from 'react';
import { apiClient } from '../../../lib/api-client';
import type { AdminStatsSummary } from '@/lib/contracts/admin-analytics';
import { DASHBOARD_CACHE_KEY } from '@/lib/admin/admin-page-warm';
import { useAdminCachedQuery } from './useAdminCachedQuery';

interface RecentOrder {
  id: string;
  number: string;
  status: string;
  paymentStatus: string;
  total: number;
  currency: string;
  customerEmail?: string;
  customerPhone?: string;
  itemsCount: number;
  createdAt: string;
}

interface TopProduct {
  variantId: string;
  productId: string;
  title: string;
  sku: string;
  totalQuantity: number;
  totalRevenue: number;
  orderCount: number;
  image?: string | null;
}

interface UserActivity {
  recentRegistrations: Array<{
    id: string;
    email?: string;
    phone?: string;
    name: string;
    registeredAt: string;
    lastLoginAt?: string;
  }>;
  activeUsers: Array<{
    id: string;
    email?: string;
    phone?: string;
    name: string;
    orderCount: number;
    totalSpent: number;
    lastOrderDate: string;
    lastLoginAt?: string;
  }>;
}

interface AdminDashboardBundleResponse {
  stats: AdminStatsSummary | null;
  recentOrders: RecentOrder[];
  topProducts: TopProduct[];
  userActivity: UserActivity | null;
}

interface UseAdminDashboardProps {
  isLoggedIn: boolean;
  isAdmin: boolean;
  isLoading: boolean;
}

export function useAdminDashboard({ isLoggedIn, isAdmin, isLoading }: UseAdminDashboardProps) {
  const enabled = !isLoading && isLoggedIn && isAdmin;

  const { data: bundle, loading } = useAdminCachedQuery<AdminDashboardBundleResponse>({
    cacheKey: DASHBOARD_CACHE_KEY,
    enabled,
    fetcher: () =>
      apiClient.get<AdminDashboardBundleResponse>('/api/v1/admin/dashboard', {
        params: {
          recentOrdersLimit: '5',
          topProductsLimit: '5',
          userActivityLimit: '10',
        },
      }),
  });

  const stats = useMemo(() => bundle?.stats ?? null, [bundle]);
  const recentOrders = useMemo(
    () => (Array.isArray(bundle?.recentOrders) ? bundle.recentOrders : []),
    [bundle],
  );
  const topProducts = useMemo(
    () => (Array.isArray(bundle?.topProducts) ? bundle.topProducts : []),
    [bundle],
  );
  const userActivity = useMemo(() => bundle?.userActivity ?? null, [bundle]);

  return {
    stats,
    recentOrders,
    topProducts,
    userActivity,
    statsLoading: loading,
    recentOrdersLoading: loading,
    topProductsLoading: loading,
    userActivityLoading: loading,
  };
}
