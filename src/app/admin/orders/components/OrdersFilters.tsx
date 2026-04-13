'use client';

import { useTranslation } from '../../../../lib/i18n-client';
import { Card } from '@shop/ui';
import type { useOrders } from '../useOrders';

interface OrdersFiltersProps {
  statusFilter: string;
  paymentStatusFilter: string;
  searchQuery: string;
  updateMessage: { type: 'success' | 'error'; text: string } | null;
  setStatusFilter: (value: string) => void;
  setPaymentStatusFilter: (value: string) => void;
  setSearchQuery: (value: string) => void;
  setPage: (value: number | ((prev: number) => number)) => void;
  router: ReturnType<typeof useOrders>['router'];
  searchParams: ReturnType<typeof useOrders>['searchParams'];
}

export function OrdersFilters({
  statusFilter,
  paymentStatusFilter,
  searchQuery,
  updateMessage,
  setStatusFilter,
  setPaymentStatusFilter,
  setSearchQuery,
  setPage,
  router,
  searchParams,
}: OrdersFiltersProps) {
  const { t } = useTranslation();

  const handleStatusChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    setPage(1);
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (newStatus) {
      params.set('status', newStatus);
    } else {
      params.delete('status');
    }
    const newUrl = params.toString() ? `/admin/orders?${params.toString()}` : '/admin/orders';
    router.push(newUrl, { scroll: false });
  };

  const handlePaymentStatusChange = (newPaymentStatus: string) => {
    setPaymentStatusFilter(newPaymentStatus);
    setPage(1);
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (newPaymentStatus) {
      params.set('paymentStatus', newPaymentStatus);
    } else {
      params.delete('paymentStatus');
    }
    const newUrl = params.toString() ? `/admin/orders?${params.toString()}` : '/admin/orders';
    router.push(newUrl, { scroll: false });
  };

  const handleSearchChange = (newSearch: string) => {
    setSearchQuery(newSearch);
    setPage(1);
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (newSearch.trim()) {
      params.set('search', newSearch.trim());
    } else {
      params.delete('search');
    }
    const newUrl = params.toString() ? `/admin/orders?${params.toString()}` : '/admin/orders';
    router.push(newUrl, { scroll: false });
  };

  return (
    <Card className="p-4 mb-6">
      <div className="flex gap-4 items-center flex-wrap">
        <select
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value)}
        >
          <option value="">{t('admin.orders.allStatuses')}</option>
          <option value="pending">{t('admin.orders.pending')}</option>
          <option value="processing">{t('admin.orders.processing')}</option>
          <option value="completed">{t('admin.orders.completed')}</option>
          <option value="cancelled">{t('admin.orders.cancelled')}</option>
        </select>
        <select
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={paymentStatusFilter}
          onChange={(e) => handlePaymentStatusChange(e.target.value)}
        >
          <option value="">{t('admin.orders.allPaymentStatuses')}</option>
          <option value="paid">{t('admin.orders.paid')}</option>
          <option value="pending">{t('admin.orders.pendingPayment')}</option>
          <option value="failed">{t('admin.orders.failed')}</option>
        </select>
        <input
          type="text"
          placeholder={t('admin.orders.searchPlaceholder')}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 min-w-[200px]"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
        {updateMessage && (
          <div
            className={`px-4 py-2 rounded-md text-sm ${
              updateMessage.type === 'success'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {updateMessage.text}
          </div>
        )}
      </div>
    </Card>
  );
}

