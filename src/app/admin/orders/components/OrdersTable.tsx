'use client';

import { useTranslation } from '../../../../lib/i18n-client';
import { AdminTableSkeleton } from '../../components/AdminTableSkeleton';
import { Card } from '@/app/admin/lib/adminShopUi';
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

function SortArrows({
  active,
  direction,
}: {
  active: boolean;
  direction: 'asc' | 'desc' | null;
}) {
  return (
    <div className="flex flex-col">
      <svg
        className={`h-3 w-3 ${active && direction === 'asc' ? 'text-admin-600' : 'text-gray-400'}`}
        fill="currentColor"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
          clipRule="evenodd"
        />
      </svg>
      <svg
        className={`-mt-1 h-3 w-3 ${active && direction === 'desc' ? 'text-admin-600' : 'text-gray-400'}`}
        fill="currentColor"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  );
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
      <Card className="p-3 sm:p-4 lg:p-5">
        <AdminTableSkeleton rows={10} columns={7} />
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card className="p-6">
        <div className="py-8 text-center">
          <p className="text-gray-600">{t('admin.orders.noOrders')}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-3 sm:p-4 lg:p-5">
      <div className="w-full overflow-x-auto">
        <table className="min-w-[68rem] w-full table-fixed divide-y divide-gray-200">
          <colgroup>
            <col className="w-[8.5rem]" />
            <col className="w-[16%]" />
            <col className="w-[10%]" />
            <col className="w-[11%]" />
            <col className="w-[16%]" />
            <col className="w-[16%]" />
            <col className="w-[12%]" />
          </colgroup>
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left align-middle text-xs font-medium uppercase tracking-wider text-gray-500">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="size-4 shrink-0 rounded border-gray-300 text-admin-600 focus:outline-none focus:ring-2 focus:ring-admin focus:ring-offset-1"
                    aria-label={t('admin.orders.selectAllOrders')}
                    checked={orders.length > 0 && orders.every((o) => selectedIds.has(o.id))}
                    onChange={onToggleSelectAll}
                  />
                  <span>{t('admin.orders.orderNumber')}</span>
                </div>
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                {t('admin.orders.customer')}
              </th>
              <th
                className="cursor-pointer select-none px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100"
                onClick={() => onSort('total')}
              >
                <div className="inline-flex items-center gap-1">
                  {t('admin.orders.total')}
                  <SortArrows
                    active={sortBy === 'total'}
                    direction={sortBy === 'total' ? sortOrder : null}
                  />
                </div>
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                {t('admin.orders.paymentMethod')}
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                {t('admin.orders.status')}
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                {t('admin.orders.payment')}
              </th>
              <th
                className="cursor-pointer select-none px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100"
                onClick={() => onSort('createdAt')}
              >
                <div className="inline-flex items-center justify-center gap-1">
                  {t('admin.orders.date')}
                  <SortArrows
                    active={sortBy === 'createdAt'}
                    direction={sortBy === 'createdAt' ? sortOrder : null}
                  />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {orders.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                selected={selectedIds.has(order.id)}
                updatingStatus={updatingStatuses.has(order.id)}
                updatingPaymentStatus={updatingPaymentStatuses.has(order.id)}
                onToggleSelect={onToggleSelect}
                onViewDetails={onViewDetails}
                onStatusChange={onStatusChange}
                onPaymentStatusChange={onPaymentStatusChange}
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
