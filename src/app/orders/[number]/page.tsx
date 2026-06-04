'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { apiClient } from '../../../lib/api-client';
import { getStoredCurrency } from '../../../lib/currency';
import { useAuth } from '../../../lib/auth/AuthContext';
import { useTranslation } from '../../../lib/i18n-client';
import { LoadingState } from './components/LoadingState';
import { ErrorState } from './components/ErrorState';
import { OrderStatus } from './components/OrderStatus';
import { OrderItems } from './components/OrderItems';
import { ShippingAddress } from './components/ShippingAddress';
import { ORDER_SUMMARY_SIDEBAR_STICKY_OUTER_CLASS } from '../../../lib/order-summary-sticky.constants';
import { OrderSummary } from './components/OrderSummary';
import {
  ORDER_PLACED_QUERY_PARAM,
  ORDER_PLACED_QUERY_VALUE,
} from '../order-placed.constants';
import { showToast } from '../../../components/Toast';
import type { Order } from './types';

export default function OrderPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const { t } = useTranslation();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState(getStoredCurrency());
  const placedToastShownRef = useRef(false);

  const orderNumber = typeof params.number === 'string' ? params.number : '';
  const guestEmail = searchParams.get('email')?.trim() ?? '';
  const justPlaced = searchParams.get(ORDER_PLACED_QUERY_PARAM) === ORDER_PLACED_QUERY_VALUE;

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

  useEffect(() => {
    if (!order || !justPlaced || placedToastShownRef.current) {
      return;
    }

    placedToastShownRef.current = true;
    showToast(
      t('orders.placedSuccess.message').replace('{number}', order.number),
      'success',
      5000
    );

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete(ORDER_PLACED_QUERY_PARAM);
    const query = nextParams.toString();
    router.replace(query ? `/orders/${order.number}?${query}` : `/orders/${order.number}`, {
      scroll: false,
    });
  }, [justPlaced, order, router, searchParams, t]);

  if (loading) {
    return <LoadingState />;
  }

  if (error || !order) {
    return <ErrorState error={error} />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {t('orders.title').replace('{number}', order.number)}
        </h1>
        <p className="text-gray-600">
          {t('orders.placedOn').replace('{date}', new Date(order.createdAt).toLocaleDateString())}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <OrderStatus
            status={order.status}
            paymentStatus={order.paymentStatus}
            fulfillmentStatus={order.fulfillmentStatus}
          />
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
