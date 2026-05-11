import { useState, useEffect, useCallback, type MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { acquireBodyScrollLock } from '../../../lib/body-scroll-lock';
import { apiClient } from '../../../lib/api-client';
import { LAYOUT_DESKTOP_MIN_WIDTH_PX } from '../../../lib/layout-breakpoints.constants';
import { useTranslation } from '../../../lib/i18n-client';
import { orderListItemToDetailsPlaceholder } from '../utils';
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
  const { t } = useTranslation();
  
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersMeta, setOrdersMeta] = useState<OrdersMeta | null>(null);

  // Order Details Modal
  const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null);
  const [orderDetailsLoading, setOrderDetailsLoading] = useState(false);
  const [orderDetailsError, setOrderDetailsError] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  useEffect(() => {
    if (!selectedOrder) return;
    return acquireBodyScrollLock();
  }, [selectedOrder]);

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

  const loadOrderDetails = async (orderNumber: string) => {
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
  };

  const handleOrderClick = (order: OrderListItem, e: MouseEvent<HTMLAnchorElement>) => {
    if (window.innerWidth >= LAYOUT_DESKTOP_MIN_WIDTH_PX) {
      e.preventDefault();
      setOrderDetailsError(null);
      setSelectedOrder(orderListItemToDetailsPlaceholder(order));
      void loadOrderDetails(order.number);
    }
  };

  const handleReOrder = async () => {
    if (!selectedOrder || !isLoggedIn) {
      router.push('/login?redirect=/profile?tab=orders');
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

      window.dispatchEvent(new Event('cart-updated'));
      
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

  return {
    orders,
    ordersLoading,
    ordersPage,
    setOrdersPage,
    ordersMeta,
    selectedOrder,
    setSelectedOrder,
    orderDetailsLoading,
    orderDetailsError,
    isReordering,
    handleOrderClick,
    handleReOrder,
  };
}

