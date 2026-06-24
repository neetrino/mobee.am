'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { apiClient } from '../../../lib/api-client';
import { getStoredCurrency } from '../../../lib/currency';
import { useAuth } from '../../../lib/auth/AuthContext';
import { useTranslation } from '../../../lib/i18n-client';
import { LoadingState } from './components/LoadingState';
import { ErrorState } from './components/ErrorState';
import { OrderConfirmationCard } from './components/OrderConfirmationCard';
import { OrderStatus } from './components/OrderStatus';
import { OrderItems } from './components/OrderItems';
import { ShippingAddress } from './components/ShippingAddress';
import { ORDER_SUMMARY_SIDEBAR_STICKY_OUTER_CLASS } from '../../../lib/order-summary-sticky.constants';
import { OrderSummary } from './components/OrderSummary';
import { ORDER_PAGE_SECTION_STACK_CLASS, ORDER_PAGE_SHELL_CLASS } from './constants';
import { formatOrderPlacedDate } from './utils/format-order-date';
import {
  ORDER_PLACED_QUERY_PARAM,
  ORDER_PLACED_QUERY_VALUE,
} from '../order-placed.constants';
import type { Order } from './types';

export default function OrderPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const { t, lang } = useTranslation();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState(getStoredCurrency());

  const orderNumber = typeof params.number === 'string' ? params.number : '';
  const guestEmail = searchParams.get('email')?.trim() ?? '';
  const justPlaced = searchParams.get(ORDER_PLACED_QUERY_PARAM) === ORDER_PLACED_QUERY_VALUE;

  const handleViewOrderDetails = useCallback(() => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete(ORDER_PLACED_QUERY_PARAM);
    const query = nextParams.toString();
    router.replace(query ? `/orders/${orderNumber}?${query}` : `/orders/${orderNumber}`, {
      scroll: false,
    });
  }, [orderNumber, router, searchParams]);

  const fetchOrder = useCallback(async () => {
    if (!orderNumber) {
      setError(t('orders.notFound.description'));
      setLoading(false);
      return;
    }

    if (!isLoggedIn && !guestEmail) {
      setError(t('orders.guestEmailRequired'));
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const path = isLoggedIn
        ? `/api/v1/orders/${orderNumber}`
        : `/api/v1/orders/${orderNumber}?email=${encodeURIComponent(guestEmail)}`;
      const response = await apiClient.get<Order>(path);
      setOrder(response);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t('orders.notFound.description');
      setError(errorMessage);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [guestEmail, isLoggedIn, orderNumber, t]);

  useEffect(() => {
    fetchOrder();

    const handleCurrencyUpdate = () => {
      setCurrency(getStoredCurrency());
    };

    window.addEventListener('currency-updated', handleCurrencyUpdate);

    return () => {
      window.removeEventListener('currency-updated', handleCurrencyUpdate);
    };
  }, [fetchOrder]);

  if (loading) {
    return <LoadingState />;
  }

  if (error || !order) {
    return <ErrorState error={error} />;
  }

  if (justPlaced) {
    return (
      <div className="bg-gray-50">
        <OrderConfirmationCard orderNumber={order.number} onViewDetails={handleViewOrderDetails} />
      </div>
    );
  }

  const placedDateLabel = formatOrderPlacedDate(order.createdAt, lang);

  return (
    <div className={ORDER_PAGE_SHELL_CLASS}>
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          {t('orders.title').replace('{number}', order.number)}
        </h1>
        <p className="text-gray-600">
          {t('orders.placedOn').replace('{date}', placedDateLabel)}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className={`lg:col-span-2 ${ORDER_PAGE_SECTION_STACK_CLASS}`}>
          <OrderStatus status={order.status} paymentStatus={order.paymentStatus} />
          <OrderItems items={order.items} currency={currency} />
          {order.shippingAddress && (
            <ShippingAddress shippingAddress={order.shippingAddress} />
          )}
        </div>

        <div className={ORDER_SUMMARY_SIDEBAR_STICKY_OUTER_CLASS}>
          <OrderSummary order={order} currency={currency} />
        </div>
      </div>
    </div>
  );
}
