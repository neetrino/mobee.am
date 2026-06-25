/**
 * Hook for admin dashboard data fetching
 */

import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '../../../lib/api-client';
import type { AdminStatsSummary } from '@/lib/contracts/admin-analytics';

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
  const [stats, setStats] = useState<AdminStatsSummary | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [userActivity, setUserActivity] = useState<UserActivity | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [recentOrdersLoading, setRecentOrdersLoading] = useState(true);
  const [topProductsLoading, setTopProductsLoading] = useState(true);
  const [userActivityLoading, setUserActivityLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    setStatsLoading(true);
    setRecentOrdersLoading(true);
    setTopProductsLoading(true);
    setUserActivityLoading(true);

    try {
      const bundle = await apiClient.get<AdminDashboardBundleResponse>('/api/v1/admin/dashboard', {
        params: {
          recentOrdersLimit: '5',
          topProductsLimit: '5',
          userActivityLimit: '10',
        },
      });

      setStats(bundle?.stats ?? null);
      setRecentOrders(Array.isArray(bundle?.recentOrders) ? bundle.recentOrders : []);
      setTopProducts(Array.isArray(bundle?.topProducts) ? bundle.topProducts : []);
      setUserActivity(bundle?.userActivity ?? null);
    } catch {
      setStats(null);
      setRecentOrders([]);
      setTopProducts([]);
      setUserActivity(null);
    } finally {
      setStatsLoading(false);
      setRecentOrdersLoading(false);
      setTopProductsLoading(false);
      setUserActivityLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && isLoggedIn && isAdmin) {
      fetchDashboard();
    }
  }, [isLoading, isLoggedIn, isAdmin, fetchDashboard]);

  return {
    stats,
    recentOrders,
    topProducts,
    userActivity,
    statsLoading,
    recentOrdersLoading,
    topProductsLoading,
    userActivityLoading,
  };
}
