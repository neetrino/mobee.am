'use client';

import { useMemo } from 'react';
import { useTranslation } from '../../../../lib/i18n-client';
import { convertPrice, CurrencyCode } from '../../../../lib/currency';
import { getPaymentStatusColor, getStatusColor } from '../utils/orderUtils';
import type { Order } from '../useOrders';
import { ORDER_ROW_CELL_VERTICAL_NUDGE_CLASS, ORDER_ROW_DATE_CELL_VERTICAL_NUDGE_CLASS, ORDER_ROW_ORDER_NUMBER_VERTICAL_CLASS, ORDER_ROW_TOTAL_PRICE_VERTICAL_CLASS } from '../orders-filters.constants';
import { OrderRowSelectDropdown } from './OrderRowSelectDropdown';

interface OrderRowProps {
  order: Order;
  selected: boolean;
  updatingStatus: boolean;
  updatingPaymentStatus: boolean;
  onToggleSelect: () => void;
  onViewDetails: () => void;
  onStatusChange: (newStatus: string) => void;
  onPaymentStatusChange: (newPaymentStatus: string) => void;
  formatCurrency: (amount: number, orderCurrency?: string, fromCurrency?: CurrencyCode) => string;
}

export function OrderRow({
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
      const totalWithoutShippingAMD = subtotalAMD - discountAMD + taxAMD;
      return formatCurrency(totalWithoutShippingAMD, order.currency, 'AMD');
    } else {
      const totalAMD = convertPrice(order.total, 'USD', 'AMD');
      const shippingAMD = order.shippingAmount || 0;
      const totalWithoutShippingAMD = totalAMD - shippingAMD;
      return formatCurrency(totalWithoutShippingAMD, order.currency, 'AMD');
    }
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="w-10 min-w-10 px-2 py-3 align-middle sm:px-3">
        <div className="flex items-center">
          <input
            type="checkbox"
            className="size-4 shrink-0 rounded border-gray-300 text-admin-600 focus:outline-none focus:ring-2 focus:ring-admin focus:ring-offset-1"
            aria-label={t('admin.orders.selectOrder').replace('{number}', order.number)}
            checked={selected}
            onChange={onToggleSelect}
          />
        </div>
      </td>
      <td
        className="px-2 py-3 align-top text-sm break-words cursor-pointer hover:bg-gray-50 sm:px-3"
        onClick={onViewDetails}
      >
        <div className={`inline-block -translate-x-[93px] ${ORDER_ROW_ORDER_NUMBER_VERTICAL_CLASS} text-sm font-medium text-gray-900`}>{order.number}</div>
      </td>
      <td
        className="px-2 py-3 align-top text-sm break-words cursor-pointer hover:bg-gray-50 sm:px-3"
        onClick={onViewDetails}
      >
        <div className="-translate-x-[100px]">
          <div className="text-sm font-medium text-gray-900">
            {[order.customerFirstName, order.customerLastName].filter(Boolean).join(' ') || t('admin.orders.unknownCustomer')}
          </div>
          {order.customerPhone && (
            <div className="text-xs text-gray-500 break-all">{order.customerPhone}</div>
          )}
          <div className="mt-2 text-xs text-admin-600">{t('admin.orders.viewOrderDetails')}</div>
        </div>
      </td>
      <td className="px-2 py-3 align-top text-sm font-medium text-gray-900 break-words sm:px-3">
        <span className={`inline-block -translate-x-[84px] ${ORDER_ROW_TOTAL_PRICE_VERTICAL_CLASS}`}>
          {calculateTotalWithoutShipping()}
        </span>
      </td>
      <td className="px-2 py-3 align-top text-sm text-gray-500 sm:px-3">
        <span className={`inline-block -translate-x-[45px] ${ORDER_ROW_CELL_VERTICAL_NUDGE_CLASS}`}>{order.itemsCount}</span>
      </td>
      <td className="px-2 py-3 align-top sm:px-3">
        <div className={`flex ${ORDER_ROW_CELL_VERTICAL_NUDGE_CLASS} items-center justify-start gap-2`}>
          {updatingStatus ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-admin"></div>
              <span className="text-xs text-gray-500">{t('admin.orders.updating')}</span>
            </div>
          ) : (
            <div className="-translate-x-[29px]">
              <OrderRowSelectDropdown
                id={`order-${order.id}-status`}
                value={order.status}
                options={statusOptions}
                onValueChange={onStatusChange}
                triggerTintClassName={getStatusColor(order.status)}
                ariaLabel={t('admin.orders.orderRowChangeStatusAria')}
                fixedStatusTriggerWidth
              />
            </div>
          )}
        </div>
      </td>
      <td className="px-2 py-3 align-top sm:px-3">
        <div className={`flex ${ORDER_ROW_CELL_VERTICAL_NUDGE_CLASS} items-center justify-start gap-2`}>
          {updatingPaymentStatus ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-admin"></div>
              <span className="text-xs text-gray-500">{t('admin.orders.updating')}</span>
            </div>
          ) : (
            <div className="-translate-x-[15px]">
              <OrderRowSelectDropdown
                id={`order-${order.id}-payment`}
                value={order.paymentStatus}
                options={paymentOptions}
                onValueChange={onPaymentStatusChange}
                triggerTintClassName={getPaymentStatusColor(order.paymentStatus)}
                ariaLabel={t('admin.orders.orderRowChangePaymentAria')}
                fixedPaymentTriggerWidth
              />
            </div>
          )}
        </div>
      </td>
      <td className="px-2 py-5 align-top text-sm text-gray-500 break-words sm:px-3">
        <span className={`inline-block ${ORDER_ROW_DATE_CELL_VERTICAL_NUDGE_CLASS}`}>
          {new Date(order.createdAt).toLocaleDateString()}
        </span>
      </td>
    </tr>
  );
}

