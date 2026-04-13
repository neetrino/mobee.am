/**
 * Hook for admin dashboard data fetching
 */

import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '../../../lib/api-client';

interface Stats {
  users: { total: number };
  products: { total: number; lowStock: number };
  orders: { total: number; recent: number; pending: number };
  revenue: { total: number; currency: string };
}

interface ActivityItem {
  type: string;
  title: string;
  description: string;
  timestamp: string;
}

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

interface UseAdminDashboardProps {
  isLoggedIn: boolean;
  isAdmin: boolean;
  isLoading: boolean;
}

export function useAdminDashboard({ isLoggedIn, isAdmin, isLoading }: UseAdminDashboardProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [userActivity, setUserActivity] = useState<UserActivity | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [recentOrdersLoading, setRecentOrdersLoading] = useState(true);
  const [topProductsLoading, setTopProductsLoading] = useState(true);
  const [userActivityLoading, setUserActivityLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      console.log('📊 [ADMIN] Fetching statistics...');
      setStatsLoading(true);

      const data = await apiClient.get<Stats>('/api/v1/admin/stats');
      console.log('✅ [ADMIN] Statistics fetched:', data);

      if (data && typeof data === 'object') {
        setStats(data);
      } else {
        console.warn('⚠️ [ADMIN] Invalid response format from server');
        setStats(null);
      }
    } catch (err: unknown) {
      console.error('❌ [ADMIN] Error fetching stats:', err);
      if (err && typeof err === 'object' && 'message' in err) {
        console.error('❌ [ADMIN] Error details:', {
          message: (err as { message?: string }).message,
          stack: (err as { stack?: string }).stack,
          status: (err as { status?: number }).status,
        });
      }
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchActivity = useCallback(async () => {
    try {
      console.log('📋 [ADMIN] Fetching recent activity...');
      setActivityLoading(true);

      const response = await apiClient.get<{ data: ActivityItem[] }>('/api/v1/admin/activity', {
        params: { limit: '10' },
      });
      console.log('✅ [ADMIN] Activity fetched:', response);

      if (response && response.data && Array.isArray(response.data)) {
        setActivity(response.data);
      } else {
        console.warn('⚠️ [ADMIN] Invalid activity response format:', response);
        setActivity([]);
      }
    } catch (err: unknown) {
      console.error('❌ [ADMIN] Error fetching activity:', err);
      if (err && typeof err === 'object' && 'message' in err) {
        console.error('❌ [ADMIN] Activity error details:', {
          message: (err as { message?: string }).message,
          status: (err as { status?: number }).status,
        });
      }
      setActivity([]);
    } finally {
      setActivityLoading(false);
    }
  }, []);

  const fetchRecentOrders = useCallback(async () => {
    try {
      console.log('📋 [ADMIN] Fetching recent orders...');
      setRecentOrdersLoading(true);
      const response = await apiClient.get<{ data: RecentOrder[] }>('/api/v1/admin/dashboard/recent-orders', {
        params: { limit: '5' },
      });
      if (response?.data && Array.isArray(response.data)) {
        setRecentOrders(response.data);
      } else {
        setRecentOrders([]);
      }
    } catch (err: unknown) {
      console.error('❌ [ADMIN] Error fetching recent orders:', err);
      setRecentOrders([]);
    } finally {
      setRecentOrdersLoading(false);
    }
  }, []);

  const fetchTopProducts = useCallback(async () => {
    try {
      console.log('📊 [ADMIN] Fetching top products...');
      setTopProductsLoading(true);
      const response = await apiClient.get<{ data: TopProduct[] }>('/api/v1/admin/dashboard/top-products', {
        params: { limit: '5' },
      });
      if (response?.data && Array.isArray(response.data)) {
        setTopProducts(response.data);
      } else {
        setTopProducts([]);
      }
    } catch (err: unknown) {
      console.error('❌ [ADMIN] Error fetching top products:', err);
      setTopProducts([]);
    } finally {
      setTopProductsLoading(false);
    }
  }, []);

  const fetchUserActivity = useCallback(async () => {
    try {
      console.log('👥 [ADMIN] Fetching user activity...');
      setUserActivityLoading(true);
      const response = await apiClient.get<{ data: UserActivity }>('/api/v1/admin/dashboard/user-activity', {
        params: { limit: '10' },
      });
      if (response?.data) {
        setUserActivity(response.data);
      } else {
        setUserActivity(null);
      }
    } catch (err: unknown) {
      console.error('❌ [ADMIN] Error fetching user activity:', err);
      setUserActivity(null);
    } finally {
      setUserActivityLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && isLoggedIn && isAdmin) {
      fetchStats();
      fetchActivity();
      fetchRecentOrders();
      fetchTopProducts();
      fetchUserActivity();
    }
  }, [isLoading, isLoggedIn, isAdmin, fetchStats, fetchActivity, fetchRecentOrders, fetchTopProducts, fetchUserActivity]);

  return {
    stats,
    activity,
    recentOrders,
    topProducts,
    userActivity,
    statsLoading,
    activityLoading,
    recentOrdersLoading,
    topProductsLoading,
    userActivityLoading,
  };
}

