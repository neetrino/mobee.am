'use client';

import { Card } from '@shop/ui';
import { useRouter } from 'next/navigation';
import { useTranslation } from '../../../lib/i18n-client';
import { formatCurrency } from '../utils/dashboardUtils';

interface Stats {
  users: { total: number };
  products: { total: number; lowStock: number };
  orders: { total: number; recent: number; pending: number };
  revenue: { total: number; currency: string };
}

interface StatsGridProps {
  stats: Stats | null;
  statsLoading: boolean;
}

export function StatsGrid({ stats, statsLoading }: StatsGridProps) {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card
        className="p-6 cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105"
        onClick={() => router.push('/admin/users')}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{t('admin.dashboard.totalUsers')}</p>
            {statsLoading ? (
              <div className="animate-pulse h-8 w-16 bg-gray-200 rounded mt-1"></div>
            ) : (
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats?.users.total ?? 0}
              </p>
            )}
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
        </div>
      </Card>

      <Card
        className="p-6 cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105"
        onClick={() => router.push('/admin/products')}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{t('admin.dashboard.totalProducts')}</p>
            {statsLoading ? (
              <div className="animate-pulse h-8 w-16 bg-gray-200 rounded mt-1"></div>
            ) : (
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats?.products.total ?? 0}
              </p>
            )}
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        </div>
      </Card>

      <Card
        className="p-6 cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105"
        onClick={() => router.push('/admin/orders')}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{t('admin.dashboard.totalOrders')}</p>
            {statsLoading ? (
              <div className="animate-pulse h-8 w-16 bg-gray-200 rounded mt-1"></div>
            ) : (
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats?.orders.total ?? 0}
              </p>
            )}
          </div>
          <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
        </div>
      </Card>

      <Card
        className="p-6 cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105"
        onClick={() => router.push('/admin/orders?filter=paid')}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{t('admin.dashboard.revenue')}</p>
            {statsLoading ? (
              <div className="animate-pulse h-8 w-24 bg-gray-200 rounded mt-1"></div>
            ) : (
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats ? formatCurrency(stats.revenue.total, stats.revenue.currency) : '0 USD'}
              </p>
            )}
          </div>
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </Card>
    </div>
  );
}

