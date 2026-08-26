'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useRouter } from '@/lib/i18n/navigation';
import { apiClient } from '../../../../lib/api-client';
import { useAuth } from '../../../../lib/auth/AuthContext';
import { useTranslation } from '../../../../lib/i18n-client';
import { LoadingState } from './components/LoadingState';
import { ErrorState } from './components/ErrorState';
import { OrderConfirmationCard } from './components/OrderConfirmationCard';
import {
  getLoginRedirectToProfileOrdersPath,
  getProfileOrdersPath,
} from '../../profile/profile-orders-path';
import {
  ORDER_PLACED_QUERY_PARAM,
  ORDER_PLACED_QUERY_VALUE,
} from '../order-placed.constants';

interface PlacedOrder {
  number: string;
}

export default function OrderPlacedPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const { t } = useTranslation();
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orderNumberParam = typeof params.number === 'string' ? params.number : '';
  const guestEmail = searchParams.get('email')?.trim() ?? '';
  const justPlaced = searchParams.get(ORDER_PLACED_QUERY_PARAM) === ORDER_PLACED_QUERY_VALUE;

  const redirectToProfileOrders = useCallback(() => {
    router.replace(isLoggedIn ? getProfileOrdersPath() : getLoginRedirectToProfileOrdersPath());
  }, [isLoggedIn, router]);

  const fetchOrderNumber = useCallback(async () => {
    if (!orderNumberParam) {
      setError(t('orders.notFound.description'));
      setLoading(false);
      return;
    }

    if (!isLoggedIn && !guestEmail) {
      redirectToProfileOrders();
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const path = isLoggedIn
        ? `/api/v1/orders/${orderNumberParam}`
        : `/api/v1/orders/${orderNumberParam}?email=${encodeURIComponent(guestEmail)}`;
      const response = await apiClient.get<PlacedOrder>(path);
      setOrderNumber(response.number);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t('orders.notFound.description');
      setError(errorMessage);
      setOrderNumber(null);
    } finally {
      setLoading(false);
    }
  }, [guestEmail, isLoggedIn, orderNumberParam, redirectToProfileOrders, t]);

  useEffect(() => {
    if (!justPlaced) {
      redirectToProfileOrders();
      return;
    }

    void fetchOrderNumber();
  }, [fetchOrderNumber, justPlaced, redirectToProfileOrders]);

  if (!justPlaced) {
    return null;
  }

  if (loading) {
    return <LoadingState />;
  }

  if (error || !orderNumber) {
    return <ErrorState error={error} />;
  }

  return (
    <div className="bg-gray-50">
      <OrderConfirmationCard orderNumber={orderNumber} isLoggedIn={isLoggedIn} />
    </div>
  );
}
