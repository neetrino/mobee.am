'use client';

import { Card } from '@shop/ui';
import { useTranslation } from '../../../../lib/i18n-client';
import { OrderItem } from './OrderItem';
import type { OrderItem as OrderItemType } from '../types';

interface OrderItemsProps {
  items: OrderItemType[];
  currency: 'USD' | 'AMD' | 'EUR' | 'RUB' | 'GEL';
}

export function OrderItems({ items, currency }: OrderItemsProps) {
  const { t } = useTranslation();

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('orders.orderItems.title')}</h2>
      <div className="space-y-4">
        {items.map((item, index) => (
          <OrderItem key={index} item={item} currency={currency} />
        ))}
      </div>
    </Card>
  );
}




