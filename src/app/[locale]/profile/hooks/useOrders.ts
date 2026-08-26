import { useState, useEffect, useCallback, useRef, type MouseEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/lib/i18n/navigation';
import { apiClient } from '../../../../lib/api-client';
import { dispatchCartUpdated } from '../../../../lib/cart/dispatch-cart-updated';
import { useTranslation } from '../../../../lib/i18n-client';
import { getLoginRedirectToProfileOrdersPath, getProfileOrdersPath } from '../profile-orders-path';
import { orderListItemToDetailsPlaceholder, orderNumberToDetailsPlaceholder } from '../utils';
import type { OrderDetails, OrderListItem, ProfileTab } from '../types';

interface OrdersMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface UseOrdersProps {
  isLoggedIn: boolean;
  authLoading: boolean;
  activeTab: ProfileTab;
  tabDataEnabled: boolean;
  onError: (error: string) => void;
  onSuccess: (message: string) => void;
}

export function useOrders({
  isLoggedIn,
  authLoading,
  activeTab,
  tabDataEnabled,
  onError,
  onSuccess,
}: UseOrdersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const orderFromUrlHandledRef = useRef<string | null>(null);
  
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersMeta, setOrdersMeta] = useState<OrdersMeta | null>(null);

  // Order Details Modal
  const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null);
  const [orderDetailsLoading, setOrderDetailsLoading] = useState(false);
  const [orderDetailsError, setOrderDetailsError] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  const loadOrders = useCallback(async () => {
    try {
      setOrdersLoading(true);
      onError('');
      const response = await apiClient.get<{
        data: OrderListItem[];
        meta: OrdersMeta;
      }>('/api/v1/orders', {
        params: {
          page: ordersPage.toString(),
          limit: '20',
        },
      });
      setOrders(response.data || []);
      setOrdersMeta(response.meta || null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Error loading orders:', err);
      onError(errorMessage || t('profile.orders.failedToLoad'));
    } finally {
      setOrdersLoading(false);
    }
  }, [ordersPage, t, onError]);

  useEffect(() => {
    if (isLoggedIn && !authLoading && activeTab === 'orders' && tabDataEnabled) {
      loadOrders();
    }
  }, [isLoggedIn, authLoading, activeTab, tabDataEnabled, loadOrders]);

  const loadOrderDetails = useCallback(async (orderNumber: string) => {
    try {
      setOrderDetailsLoading(true);
      setOrderDetailsError(null);
      const data = await apiClient.get<OrderDetails>(`/api/v1/orders/${orderNumber}`);
      setSelectedOrder(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Error loading order details:', err);
      setOrderDetailsError(errorMessage || t('profile.orderDetails.failedToLoad'));
    } finally {
      setOrderDetailsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const orderNumber = searchParams.get('order')?.trim();
    if (
      !isLoggedIn ||
      authLoading ||
      activeTab !== 'orders' ||
      !tabDataEnabled ||
      !orderNumber ||
      orderFromUrlHandledRef.current === orderNumber
    ) {
      return;
    }

    orderFromUrlHandledRef.current = orderNumber;
    setOrderDetailsError(null);
    const listOrder = orders.find((order) => order.number === orderNumber);
    setSelectedOrder(
      listOrder ? orderListItemToDetailsPlaceholder(listOrder) : orderNumberToDetailsPlaceholder(orderNumber),
    );
    void loadOrderDetails(orderNumber);
  }, [activeTab, authLoading, isLoggedIn, loadOrderDetails, orders, searchParams, tabDataEnabled]);

  const handleOrderClick = (order: OrderListItem, e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setOrderDetailsError(null);
    setSelectedOrder(orderListItemToDetailsPlaceholder(order));
    void loadOrderDetails(order.number);
    router.replace(getProfileOrdersPath({ orderNumber: order.number }), { scroll: false });
  };

  const handleReOrder = async () => {
    if (!selectedOrder || !isLoggedIn) {
      router.push(getLoginRedirectToProfileOrdersPath());
      return;
    }

    setIsReordering(true);
    try {
      interface ReorderResponse {
        added: number;
        skipped: number;
      }

      const result = await apiClient.post<ReorderResponse>(
        `/api/v1/orders/${selectedOrder.number}/reorder`
      );

      const addedCount = result.added;
      const skippedCount = result.skipped;

      dispatchCartUpdated();
      
      if (addedCount > 0) {
        const skippedText = skippedCount > 0 ? `, ${skippedCount} ${t('profile.orderDetails.skipped')}` : '';
        onSuccess(`${addedCount} ${t('profile.orderDetails.itemsAdded')}${skippedText}`);
        setTimeout(() => {
          router.push('/cart');
        }, 1500);
      } else {
        onError(t('profile.orderDetails.failedToAdd'));
      }
    } catch (error: unknown) {
      console.error('[Profile][ReOrder] Error during re-order:', error);
      onError(t('profile.orderDetails.failedToAdd'));
    } finally {
      setIsReordering(false);
    }
  };

  const closeOrderDetails = useCallback(() => {
    setSelectedOrder(null);
    orderFromUrlHandledRef.current = null;
    if (searchParams.get('order')) {
      router.replace(getProfileOrdersPath(), { scroll: false });
    }
  }, [router, searchParams]);

  return {
    orders,
    ordersLoading,
    ordersPage,
    setOrdersPage,
    ordersMeta,
    selectedOrder,
    setSelectedOrder,
    closeOrderDetails,
    orderDetailsLoading,
    orderDetailsError,
    isReordering,
    handleOrderClick,
    handleReOrder,
  };
}

