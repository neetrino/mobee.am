'use client';

import { useTranslation } from '../../../../lib/i18n-client';
import { OrderItem } from './OrderItem';
import { ORDER_PAGE_CARD_CLASS, ORDER_PAGE_CARD_TITLE_CLASS } from '../constants';
import type { OrderItem as OrderItemType } from '../types';

interface OrderItemsProps {
  items: OrderItemType[];
  currency: 'USD' | 'AMD' | 'EUR' | 'RUB' | 'GEL';
}

export function OrderItems({ items, currency }: OrderItemsProps) {
  const { t } = useTranslation();

  return (
    <section className={ORDER_PAGE_CARD_CLASS}>
      <h2 className={`${ORDER_PAGE_CARD_TITLE_CLASS} mb-6`}>{t('orders.orderItems.title')}</h2>
      <div className="space-y-6">
        {items.map((item, index) => (
          <OrderItem key={index} item={item} currency={currency} />
        ))}
      </div>
    </section>
  );
}
