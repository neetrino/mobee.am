'use client';

import { useRouter } from 'next/navigation';
import { Card } from '@shop/ui';
import { useTranslation } from '../../../../lib/i18n-client';
import { formatCurrency } from '../utils';
import type { AnalyticsData } from '../types';

interface StatsCardsProps {
  analytics: AnalyticsData;
  totalUsers: number | null;
}

export function StatsCards({ analytics, totalUsers }: StatsCardsProps) {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      <Card 
        className="p-6 bg-gradient-to-br from-admin-50 to-admin-100 border-admin-200 hover:shadow-lg hover:scale-105 hover:border-admin-400 transition-all duration-200 group cursor-pointer relative"
        onClick={() => router.push('/supersudo/orders')}
        title={t('admin.analytics.clickToViewAllOrders')}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="w-12 h-12 bg-admin-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <svg className="w-4 h-4 text-admin-600 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
        <p className="text-sm font-medium text-admin-700 mb-1">{t('admin.analytics.totalOrders')}</p>
        <p className="text-3xl font-bold text-admin-900">
          {analytics.orders.totalOrders}
        </p>
      </Card>

      <Card 
        className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg hover:scale-105 hover:border-green-400 transition-all duration-200 group cursor-pointer relative"
        onClick={() => router.push('/supersudo/orders?paymentStatus=paid')}
        title={t('admin.analytics.clickToViewPaidOrders')}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <svg className="w-4 h-4 text-green-600 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
        <p className="text-sm font-medium text-green-700 mb-1">{t('admin.analytics.totalRevenue')}</p>
        <p className="text-2xl font-bold text-green-900">
          {formatCurrency(analytics.orders.totalRevenue, analytics.orders.currency)}
        </p>
      </Card>

      <Card 
        className="p-6 bg-gradient-to-br from-admin-50 to-admin-100 border-admin-200 hover:shadow-lg hover:scale-105 hover:border-admin-400 transition-all duration-200 group cursor-default relative"
        title={t('admin.analytics.totalRegisteredUsers')}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="w-12 h-12 bg-admin-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-1a4 4 0 00-4-4h-1M7 20H2v-1a4 4 0 014-4h1m4-9a3 3 0 110 6 3 3 0 010-6zm6 3a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        </div>
        <p className="text-sm font-medium text-admin-700 mb-1">{t('admin.analytics.totalUsers')}</p>
        <p className="text-3xl font-bold text-admin-900">
          {totalUsers !== null ? totalUsers : '—'}
        </p>
      </Card>
    </div>
  );
}




