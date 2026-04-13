'use client';

import { useTranslation } from '../../../../lib/i18n-client';
import { Card } from '@shop/ui';
import { CurrencyCode } from '../../../../lib/currency';
import { OrderRow } from './OrderRow';
import { OrdersPagination } from './OrdersPagination';
import type { Order } from '../useOrders';

interface OrdersTableProps {
  orders: Order[];
  loading: boolean;
  selectedIds: Set<string>;
  updatingStatuses: Set<string>;
  updatingPaymentStatuses: Set<string>;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  page: number;
  meta: { total: number; page: number; limit: number; totalPages: number } | null;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onSort: (column: string) => void;
  onViewDetails: (orderId: string) => void;
  onStatusChange: (orderId: string, newStatus: string) => void;
  onPaymentStatusChange: (orderId: string, newPaymentStatus: string) => void;
  onPageChange: (newPage: number) => void;
  formatCurrency: (amount: number, orderCurrency?: string, fromCurrency?: CurrencyCode) => string;
}

export function OrdersTable({
  orders,
  loading,
  selectedIds,
  updatingStatuses,
  updatingPaymentStatuses,
  sortBy,
  sortOrder,
  page,
  meta,
  onToggleSelect,
  onToggleSelectAll,
  onSort,
  onViewDetails,
  onStatusChange,
  onPaymentStatusChange,
  onPageChange,
  formatCurrency,
}: OrdersTableProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('admin.orders.loadingOrders')}</p>
        </div>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <p className="text-gray-600">{t('admin.orders.noOrders')}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  aria-label={t('admin.orders.selectAllOrders')}
                  checked={orders.length > 0 && orders.every(o => selectedIds.has(o.id))}
                  onChange={onToggleSelectAll}
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('admin.orders.orderNumber')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('admin.orders.customer')}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => onSort('total')}
              >
                <div className="flex items-center gap-1">
                  {t('admin.orders.total')}
                  <div className="flex flex-col">
                    <svg
                      className={`w-3 h-3 ${sortBy === 'total' && sortOrder === 'asc' ? 'text-blue-600' : 'text-gray-400'}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                    <svg
                      className={`w-3 h-3 -mt-1 ${sortBy === 'total' && sortOrder === 'desc' ? 'text-blue-600' : 'text-gray-400'}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('admin.orders.items')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('admin.orders.status')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('admin.orders.payment')}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => onSort('createdAt')}
              >
                <div className="flex items-center gap-1">
                  {t('admin.orders.date')}
                  <div className="flex flex-col">
                    <svg
                      className={`w-3 h-3 ${sortBy === 'createdAt' && sortOrder === 'asc' ? 'text-blue-600' : 'text-gray-400'}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                    <svg
                      className={`w-3 h-3 -mt-1 ${sortBy === 'createdAt' && sortOrder === 'desc' ? 'text-blue-600' : 'text-gray-400'}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                selected={selectedIds.has(order.id)}
                updatingStatus={updatingStatuses.has(order.id)}
                updatingPaymentStatus={updatingPaymentStatuses.has(order.id)}
                onToggleSelect={() => onToggleSelect(order.id)}
                onViewDetails={() => onViewDetails(order.id)}
                onStatusChange={(newStatus) => onStatusChange(order.id, newStatus)}
                onPaymentStatusChange={(newPaymentStatus) => onPaymentStatusChange(order.id, newPaymentStatus)}
                formatCurrency={formatCurrency}
              />
            ))}
          </tbody>
        </table>
      </div>

      {meta && (
        <OrdersPagination
          page={page}
          totalPages={meta.totalPages}
          total={meta.total}
          onPageChange={onPageChange}
        />
      )}
    </Card>
  );
}

