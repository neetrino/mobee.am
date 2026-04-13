'use client';

import { Card } from '@shop/ui';
import { useTranslation } from '../../../../lib/i18n-client';

interface OrderStatusProps {
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
}

function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'confirmed':
      return 'bg-blue-100 text-blue-800';
    case 'processing':
      return 'bg-purple-100 text-purple-800';
    case 'shipped':
      return 'bg-indigo-100 text-indigo-800';
    case 'delivered':
      return 'bg-green-100 text-green-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function OrderStatus({ status, paymentStatus, fulfillmentStatus }: OrderStatusProps) {
  const { t } = useTranslation();

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('orders.orderStatus.title')}</h2>
      <div className="flex items-center gap-4">
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status)}`}>
          {status}
        </span>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(paymentStatus)}`}>
          {t('orders.orderStatus.payment').replace('{status}', paymentStatus)}
        </span>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(fulfillmentStatus)}`}>
          {t('orders.orderStatus.fulfillment').replace('{status}', fulfillmentStatus)}
        </span>
      </div>
    </Card>
  );
}




