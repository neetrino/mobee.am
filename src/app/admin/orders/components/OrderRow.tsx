'use client';

import { useTranslation } from '../../../../lib/i18n-client';
import { convertPrice, CurrencyCode } from '../../../../lib/currency';
import {
  getFulfillmentStatusColor,
  getPaymentStatusColor,
  getStatusColor,
} from '../utils/orderUtils';
import type { Order } from '../useOrders';

interface OrderRowProps {
  order: Order;
  selected: boolean;
  updatingStatus: boolean;
  updatingPaymentStatus: boolean;
  updatingFulfillmentStatus: boolean;
  onToggleSelect: () => void;
  onViewDetails: () => void;
  onStatusChange: (newStatus: string) => void;
  onPaymentStatusChange: (newPaymentStatus: string) => void;
  onFulfillmentStatusChange: (newFulfillmentStatus: string) => void;
  formatCurrency: (amount: number, orderCurrency?: string, fromCurrency?: CurrencyCode) => string;
}

export function OrderRow({
  order,
  selected,
  updatingStatus,
  updatingPaymentStatus,
  updatingFulfillmentStatus,
  onToggleSelect,
  onViewDetails,
  onStatusChange,
  onPaymentStatusChange,
  onFulfillmentStatusChange,
  formatCurrency,
}: OrderRowProps) {
  const { t } = useTranslation();

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
      <td className="px-2 py-3 align-top sm:px-3">
        <input
          type="checkbox"
          aria-label={t('admin.orders.selectOrder').replace('{number}', order.number)}
          checked={selected}
          onChange={onToggleSelect}
        />
      </td>
      <td
        className="px-2 py-3 align-top text-sm break-words cursor-pointer hover:bg-gray-50 sm:px-3"
        onClick={onViewDetails}
      >
        <div className="text-sm font-medium text-gray-900">{order.number}</div>
      </td>
      <td
        className="px-2 py-3 align-top text-sm break-words cursor-pointer hover:bg-gray-50 sm:px-3"
        onClick={onViewDetails}
      >
        <div className="text-sm font-medium text-gray-900">
          {[order.customerFirstName, order.customerLastName].filter(Boolean).join(' ') || t('admin.orders.unknownCustomer')}
        </div>
        {order.customerPhone && (
          <div className="text-xs text-gray-500 break-all">{order.customerPhone}</div>
        )}
        <div className="mt-1 text-xs text-admin-600">{t('admin.orders.viewOrderDetails')}</div>
      </td>
      <td className="px-2 py-3 align-top text-sm font-medium text-gray-900 break-words sm:px-3">
        {calculateTotalWithoutShipping()}
      </td>
      <td className="px-2 py-3 align-top text-sm text-gray-500 sm:px-3">
        {order.itemsCount}
      </td>
      <td className="px-2 py-3 align-top sm:px-3">
        <div className="flex items-center gap-2">
          {updatingStatus ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-admin"></div>
              <span className="text-xs text-gray-500">{t('admin.orders.updating')}</span>
            </div>
          ) : (
            <select
              value={order.status}
              onChange={(e) => onStatusChange(e.target.value)}
              className={`w-full min-w-0 px-2 py-1 text-xs font-medium rounded-md border-0 focus:outline-none focus:ring-2 focus:ring-admin cursor-pointer ${getStatusColor(order.status)}`}
            >
              <option value="pending">{t('admin.orders.pending')}</option>
              <option value="processing">{t('admin.orders.processing')}</option>
              <option value="completed">{t('admin.orders.completed')}</option>
              <option value="cancelled">{t('admin.orders.cancelled')}</option>
            </select>
          )}
        </div>
      </td>
      <td className="px-2 py-3 align-top sm:px-3">
        <div className="flex items-center gap-2">
          {updatingPaymentStatus ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-admin"></div>
              <span className="text-xs text-gray-500">{t('admin.orders.updating')}</span>
            </div>
          ) : (
            <select
              value={order.paymentStatus}
              onChange={(e) => onPaymentStatusChange(e.target.value)}
              className={`w-full min-w-0 px-2 py-1 text-xs font-medium rounded-md border-0 focus:outline-none focus:ring-2 focus:ring-admin cursor-pointer ${getPaymentStatusColor(order.paymentStatus)}`}
            >
              <option value="paid">{t('admin.orders.paid')}</option>
              <option value="pending">{t('admin.orders.pendingPayment')}</option>
              <option value="failed">{t('admin.orders.failed')}</option>
            </select>
          )}
        </div>
      </td>
      <td className="px-2 py-3 align-top sm:px-3">
        <div className="flex items-center gap-2">
          {updatingFulfillmentStatus ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-admin"></div>
              <span className="text-xs text-gray-500">{t('admin.orders.updating')}</span>
            </div>
          ) : (
            <select
              value={order.fulfillmentStatus}
              onChange={(e) => onFulfillmentStatusChange(e.target.value)}
              className={`w-full min-w-0 px-2 py-1 text-xs font-medium rounded-md border-0 focus:outline-none focus:ring-2 focus:ring-admin cursor-pointer ${getFulfillmentStatusColor(order.fulfillmentStatus)}`}
            >
              <option value="unfulfilled">{t('admin.orders.unfulfilled')}</option>
              <option value="fulfilled">{t('admin.orders.fulfilled')}</option>
              <option value="shipped">{t('admin.orders.shipped')}</option>
              <option value="delivered">{t('admin.orders.delivered')}</option>
            </select>
          )}
        </div>
      </td>
      <td className="px-2 py-3 align-top text-sm text-gray-500 break-words sm:px-3">
        {new Date(order.createdAt).toLocaleDateString()}
      </td>
    </tr>
  );
}

