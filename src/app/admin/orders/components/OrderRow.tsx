'use client';

import { memo, useMemo, type MouseEvent } from 'react';
import { useTranslation } from '../../../../lib/i18n-client';
import { convertPrice, CurrencyCode } from '../../../../lib/currency';
import {
  formatOrderPostedDateTime,
  formatPaymentMethodLabel,
  getPaymentStatusColor,
  getStatusColor,
} from '../utils/orderUtils';
import type { Order } from '../useOrders';
import { OrderRowSelectDropdown } from './OrderRowSelectDropdown';

interface OrderRowProps {
  order: Order;
  selected: boolean;
  updatingStatus: boolean;
  updatingPaymentStatus: boolean;
  onToggleSelect: (orderId: string) => void;
  onViewDetails: (orderId: string) => void;
  onStatusChange: (orderId: string, newStatus: string) => void;
  onPaymentStatusChange: (orderId: string, newPaymentStatus: string) => void;
  formatCurrency: (amount: number, orderCurrency?: string, fromCurrency?: CurrencyCode) => string;
}

function stopRowNavigation(event: MouseEvent<HTMLElement>): void {
  event.stopPropagation();
}

export const OrderRow = memo(function OrderRow({
  order,
  selected,
  updatingStatus,
  updatingPaymentStatus,
  onToggleSelect,
  onViewDetails,
  onStatusChange,
  onPaymentStatusChange,
  formatCurrency,
}: OrderRowProps) {
  const { t } = useTranslation();

  const statusOptions = useMemo(
    () =>
      [
        { value: 'pending', label: t('admin.orders.pending') },
        { value: 'processing', label: t('admin.orders.processing') },
        { value: 'completed', label: t('admin.orders.completed') },
        { value: 'cancelled', label: t('admin.orders.cancelled') },
      ] as const,
    [t],
  );

  const paymentOptions = useMemo(
    () =>
      [
        { value: 'paid', label: t('admin.orders.paid') },
        { value: 'pending', label: t('admin.orders.pendingPayment') },
        { value: 'failed', label: t('admin.orders.failed') },
      ] as const,
    [t],
  );

  const calculateTotalWithoutShipping = () => {
    if (order.subtotal !== undefined && order.discountAmount !== undefined && order.taxAmount !== undefined) {
      const subtotalAMD = convertPrice(order.subtotal, 'USD', 'AMD');
      const discountAMD = convertPrice(order.discountAmount, 'USD', 'AMD');
      const taxAMD = convertPrice(order.taxAmount, 'USD', 'AMD');
      return formatCurrency(subtotalAMD - discountAMD + taxAMD, order.currency, 'AMD');
    }

    const totalAMD = convertPrice(order.total, 'USD', 'AMD');
    const shippingAMD = order.shippingAmount || 0;
    return formatCurrency(totalAMD - shippingAMD, order.currency, 'AMD');
  };

  const postedDateTime = formatOrderPostedDateTime(order.createdAt);
  const paymentMethodLabel = formatPaymentMethodLabel(order.paymentMethod);
  const customerName =
    [order.customerFirstName, order.customerLastName].filter(Boolean).join(' ') ||
    t('admin.orders.unknownCustomer');

  return (
    <tr className="cursor-pointer hover:bg-gray-50" onClick={() => onViewDetails(order.id)}>
      <td className="px-3 py-4 align-middle">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            className="size-4 shrink-0 rounded border-gray-300 text-admin-600 focus:outline-none focus:ring-2 focus:ring-admin focus:ring-offset-1"
            aria-label={t('admin.orders.selectOrder').replace('{number}', order.number)}
            checked={selected}
            onClick={stopRowNavigation}
            onChange={() => onToggleSelect(order.id)}
          />
          <span className="text-sm font-medium text-gray-900">{order.number}</span>
        </div>
      </td>
      <td className="min-w-0 px-3 py-4 align-middle">
        <div className="truncate text-sm font-medium text-gray-900" title={customerName}>
          {customerName}
        </div>
        {order.customerPhone ? (
          <div className="truncate text-xs text-gray-500" title={order.customerPhone}>
            {order.customerPhone}
          </div>
        ) : null}
      </td>
      <td className="px-3 py-4 align-middle text-sm font-medium tabular-nums text-gray-900">
        {calculateTotalWithoutShipping()}
      </td>
      <td className="px-3 py-4 align-middle text-center text-sm text-gray-900">
        {paymentMethodLabel}
      </td>
      <td className="px-3 py-4 align-middle text-center" onClick={stopRowNavigation}>
        {updatingStatus ? (
          <div className="inline-flex items-center justify-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-admin" />
            <span className="text-xs text-gray-500">{t('admin.orders.updating')}</span>
          </div>
        ) : (
          <div className="inline-flex justify-center">
            <OrderRowSelectDropdown
              id={`order-${order.id}-status`}
              value={order.status}
              options={statusOptions}
              onValueChange={(newStatus) => onStatusChange(order.id, newStatus)}
              triggerTintClassName={getStatusColor(order.status)}
              ariaLabel={t('admin.orders.orderRowChangeStatusAria')}
              fixedStatusTriggerWidth
            />
          </div>
        )}
      </td>
      <td className="px-3 py-4 align-middle text-center" onClick={stopRowNavigation}>
        {updatingPaymentStatus ? (
          <div className="inline-flex items-center justify-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-admin" />
            <span className="text-xs text-gray-500">{t('admin.orders.updating')}</span>
          </div>
        ) : (
          <div className="inline-flex justify-center">
            <OrderRowSelectDropdown
              id={`order-${order.id}-payment`}
              value={order.paymentStatus}
              options={paymentOptions}
              onValueChange={(newPaymentStatus) => onPaymentStatusChange(order.id, newPaymentStatus)}
              triggerTintClassName={getPaymentStatusColor(order.paymentStatus)}
              ariaLabel={t('admin.orders.orderRowChangePaymentAria')}
              fixedPaymentTriggerWidth
            />
          </div>
        )}
      </td>
      <td className="px-3 py-4 align-middle text-center">
        <div className="inline-flex flex-col items-center">
          <span className="text-sm font-bold tabular-nums text-gray-900">{postedDateTime.time}</span>
          <span className="text-xs tabular-nums text-gray-400">{postedDateTime.date}</span>
        </div>
      </td>
    </tr>
  );
});
