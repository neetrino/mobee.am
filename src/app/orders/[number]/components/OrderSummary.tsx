'use client';

import Link from 'next/link';
import { Button } from '@shop/ui';
import { useTranslation } from '../../../../lib/i18n-client';
import { formatPriceInCurrency, convertPrice } from '../../../../lib/currency';
import { ORDER_PAGE_CARD_CLASS, ORDER_PAGE_CARD_TITLE_CLASS } from '../constants';
import type { Order } from '../types';

interface OrderSummaryProps {
  order: Order;
  currency: 'USD' | 'AMD' | 'EUR' | 'RUB' | 'GEL';
}

export function OrderSummary({ order, currency }: OrderSummaryProps) {
  const { t } = useTranslation();

  const subtotalDisplay = (() => {
    const subtotalAMD = convertPrice(order.totals.subtotal, 'USD', 'AMD');
    return currency === 'AMD' ? subtotalAMD : convertPrice(subtotalAMD, 'AMD', currency);
  })();

  const discountDisplay = order.totals.discount > 0 ? (() => {
    const discountAMD = convertPrice(order.totals.discount, 'USD', 'AMD');
    return currency === 'AMD' ? discountAMD : convertPrice(discountAMD, 'AMD', currency);
  })() : null;

  const shippingDisplay =
    order.shippingMethod === 'pickup'
      ? t('checkout.shipping.freePickup')
      : (() => {
          const shippingAMD = order.totals.shipping;
          const shippingDisplayValue =
            currency === 'AMD' ? shippingAMD : convertPrice(shippingAMD, 'AMD', currency);
          return (
            formatPriceInCurrency(shippingDisplayValue, currency) +
            (order.shippingAddress?.city ? ` (${order.shippingAddress.city})` : '')
          );
        })();

  const totalDisplay = (() => {
    const totalAMD = convertPrice(order.totals.total, 'USD', 'AMD');
    return currency === 'AMD' ? totalAMD : convertPrice(totalAMD, 'AMD', currency);
  })();

  return (
    <section className={ORDER_PAGE_CARD_CLASS}>
      <h2 className={`${ORDER_PAGE_CARD_TITLE_CLASS} mb-6`}>{t('orders.orderSummary.title')}</h2>
      <div className="mb-6 space-y-4">
        {order.totals ? (
          <>
            <div className="flex justify-between text-gray-600">
              <span>{t('orders.orderSummary.subtotal')}</span>
              <span>{formatPriceInCurrency(subtotalDisplay, currency)}</span>
            </div>
            {order.totals.discount > 0 && discountDisplay !== null ? (
              <div className="flex justify-between text-gray-600">
                <span>{t('orders.orderSummary.discount')}</span>
                <span>-{formatPriceInCurrency(discountDisplay, currency)}</span>
              </div>
            ) : null}
            <div className="flex justify-between text-gray-600">
              <span>{t('orders.orderSummary.shipping')}</span>
              <span className="text-right">{shippingDisplay}</span>
            </div>
            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between text-lg font-bold text-gray-900">
                <span>{t('orders.orderSummary.total')}</span>
                <span>{formatPriceInCurrency(totalDisplay, currency)}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="text-gray-600">{t('orders.orderSummary.loadingTotals')}</div>
        )}
      </div>

      <div className="space-y-3">
        <Link href="/products">
          <Button variant="brand" className="w-full">
            {t('orders.buttons.continueShopping')}
          </Button>
        </Link>
        <Link href="/cart">
          <Button variant="ghost" className="w-full">
            {t('orders.buttons.viewCart')}
          </Button>
        </Link>
      </div>
    </section>
  );
}
