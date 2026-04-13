'use client';

import { Card } from '@shop/ui';
import { useTranslation } from '../../../lib/i18n-client';
import { formatCurrency, formatDate } from '../utils/dashboardUtils';

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

interface UserActivityCardProps {
  userActivity: UserActivity | null;
  userActivityLoading: boolean;
}

export function UserActivityCard({ userActivity, userActivityLoading }: UserActivityCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="p-6 mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('admin.dashboard.userActivity')}</h2>
      {userActivityLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : userActivity ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">{t('admin.dashboard.recentRegistrations')}</h3>
            <div className="space-y-3">
              {userActivity.recentRegistrations.length === 0 ? (
                <p className="text-sm text-gray-600">{t('admin.dashboard.noRecentRegistrations')}</p>
              ) : (
                userActivity.recentRegistrations.slice(0, 5).map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-600">{user.email || user.phone || 'N/A'}</p>
                      <p className="text-xs text-gray-500 mt-1">{formatDate(user.registeredAt)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">{t('admin.dashboard.mostActiveUsers')}</h3>
            <div className="space-y-3">
              {userActivity.activeUsers.length === 0 ? (
                <p className="text-sm text-gray-600">{t('admin.dashboard.noActiveUsers')}</p>
              ) : (
                userActivity.activeUsers.slice(0, 5).map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-600">{user.email || user.phone || 'N/A'}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {t('admin.dashboard.ordersCount').replace('{count}', user.orderCount.toString())} • {formatCurrency(user.totalSpent, 'USD')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-600">{t('admin.dashboard.noUserActivityData')}</p>
      )}
    </Card>
  );
}

