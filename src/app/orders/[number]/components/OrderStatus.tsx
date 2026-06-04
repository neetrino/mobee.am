'use client';

import { useTranslation } from '../../../../lib/i18n-client';
import {
  ORDER_PAGE_CARD_CLASS,
  ORDER_PAGE_CARD_TITLE_CLASS,
  ORDER_STATUS_BADGE_CLASS,
} from '../constants';

interface OrderStatusProps {
  status: string;
  paymentStatus: string;
}

export function OrderStatus({ status, paymentStatus }: OrderStatusProps) {
  const { t } = useTranslation();

  return (
    <section className={ORDER_PAGE_CARD_CLASS}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className={ORDER_PAGE_CARD_TITLE_CLASS}>{t('orders.orderStatus.title')}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <span className={ORDER_STATUS_BADGE_CLASS}>{status}</span>
          <span className={ORDER_STATUS_BADGE_CLASS}>
            {t('orders.orderStatus.payment').replace('{status}', paymentStatus)}
          </span>
        </div>
      </div>
    </section>
  );
}
