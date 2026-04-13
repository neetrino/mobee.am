import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../../lib/api-client';
import { useTranslation } from '../../../lib/i18n-client';
import type { DashboardData } from '../types';

interface UseDashboardProps {
  isLoggedIn: boolean;
  authLoading: boolean;
  activeTab: string;
  onError: (error: string) => void;
}

export function useDashboard({
  isLoggedIn,
  authLoading,
  activeTab,
  onError,
}: UseDashboardProps) {
  const { t } = useTranslation();
  
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      console.log('📊 [PROFILE] Loading dashboard data...');
      setDashboardLoading(true);
      onError('');
      const data = await apiClient.get<DashboardData>('/api/v1/users/dashboard');
      console.log('✅ [PROFILE] Dashboard data loaded:', data);
      setDashboardData(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('❌ [PROFILE] Error loading dashboard:', err);
      onError(errorMessage || t('profile.dashboard.failedToLoad'));
    } finally {
      setDashboardLoading(false);
    }
  }, [t, onError]);

  // Load dashboard when dashboard tab is active
  useEffect(() => {
    if (isLoggedIn && !authLoading && activeTab === 'dashboard') {
      loadDashboard();
    }
  }, [isLoggedIn, authLoading, activeTab, loadDashboard]);

  return {
    dashboardData,
    dashboardLoading,
  };
}




