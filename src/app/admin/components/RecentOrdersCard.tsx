'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from '../../../lib/i18n-client';
import { formatCurrency } from '../utils/dashboardUtils';
import {
  ADMIN_DASH_CARD_CLASS,
  ADMIN_DASH_CARD_HOVER_CLASS,
} from '../dashboard-ui.constants';

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

function paymentBadgeClass(paymentStatus: string): string {
  switch (paymentStatus) {
    case 'paid':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function RecentOrdersCard({ recentOrders, recentOrdersLoading }: RecentOrdersCardProps) {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <div className={`${ADMIN_DASH_CARD_CLASS} p-4`}>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">{t('admin.dashboard.recentOrders')}</h2>
        <Link
          href="/supersudo/orders"
          className="rounded-[12px] px-2 py-1 text-xs font-medium text-admin-600 hover:bg-admin-50"
        >
          {t('admin.dashboard.viewAll')}
        </Link>
      </div>
      <div className="space-y-2">
        {recentOrdersLoading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-[12px] bg-gray-100" />
          ))
        ) : recentOrders.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-600">{t('admin.dashboard.noRecentOrders')}</p>
        ) : (
          recentOrders.map((order) => (
            <button
              key={order.id}
              type="button"
              onClick={() => router.push(`/supersudo/orders?search=${order.number}`)}
              className={`block w-full rounded-[12px] px-3 py-2 text-left ring-1 ring-gray-100/80 ${ADMIN_DASH_CARD_HOVER_CLASS}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">#{order.number}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${paymentBadgeClass(order.paymentStatus)}`}>
                      {order.paymentStatus}
                    </span>
                  </div>
                  <p className="truncate text-[11px] text-gray-500">
                    {order.customerEmail || order.customerPhone || t('admin.dashboard.guest')}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-gray-900">
                  {formatCurrency(order.total, order.currency)}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
