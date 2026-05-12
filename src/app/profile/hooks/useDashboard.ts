import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../../lib/api-client';
import { useTranslation } from '../../../lib/i18n-client';
import type { DashboardData } from '../types';

interface UseDashboardProps {
  isLoggedIn: boolean;
  authLoading: boolean;
  activeTab: string;
  /** Mobile: sheet open. Desktop: inline tab layout — always fetch when tab matches. */
  tabDataEnabled: boolean;
  onError: (error: string) => void;
}

export function useDashboard({
  isLoggedIn,
  authLoading,
  activeTab,
  tabDataEnabled,
  onError,
}: UseDashboardProps) {
  const { t } = useTranslation();
  
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      setDashboardLoading(true);
      onError('');
      const data = await apiClient.get<DashboardData>('/api/v1/users/dashboard');
      setDashboardData(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      onError(errorMessage || t('profile.dashboard.failedToLoad'));
    } finally {
      setDashboardLoading(false);
    }
  }, [t, onError]);

  useEffect(() => {
    if (isLoggedIn && !authLoading && activeTab === 'dashboard' && tabDataEnabled) {
      loadDashboard();
    }
  }, [isLoggedIn, authLoading, activeTab, tabDataEnabled, loadDashboard]);

  return {
    dashboardData,
    dashboardLoading,
  };
}




