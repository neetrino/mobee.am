'use client';

import { Card, Button } from '@shop/ui';
import { useRouter } from 'next/navigation';
import { useTranslation } from '../../../lib/i18n-client';
import { formatCurrency, formatDate } from '../utils/dashboardUtils';

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

interface RecentOrdersCardProps {
  recentOrders: RecentOrder[];
  recentOrdersLoading: boolean;
}

export function RecentOrdersCard({ recentOrders, recentOrdersLoading }: RecentOrdersCardProps) {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">{t('admin.dashboard.recentOrders')}</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/admin/orders')}
        >
          {t('admin.dashboard.viewAll')}
        </Button>
      </div>
      <div className="space-y-4">
        {recentOrdersLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="text-sm text-gray-600 text-center py-8">
            <p>{t('admin.dashboard.noRecentOrders')}</p>
          </div>
        ) : (
          recentOrders.map((order) => (
            <div
              key={order.id}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => router.push(`/admin/orders?search=${order.number}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-gray-900">#{order.number}</p>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        order.paymentStatus === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : order.paymentStatus === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {order.paymentStatus}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    {order.customerEmail || order.customerPhone || t('admin.dashboard.guest')}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {order.itemsCount === 1
                      ? t('admin.dashboard.items').replace('{count}', order.itemsCount.toString())
                      : t('admin.dashboard.itemsPlural').replace('{count}', order.itemsCount.toString())}{' '}
                    • {formatDate(order.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    {formatCurrency(order.total, order.currency)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

