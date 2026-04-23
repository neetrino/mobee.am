'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '../../../lib/api-client';
import { useTranslation } from '../../../lib/i18n-client';
import { formatPriceInCurrency, convertPrice, getStoredCurrency, initializeCurrencyRates, CurrencyCode } from '../../../lib/currency';

export interface Order {
  id: string;
  number: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  total: number;
  subtotal?: number;
  discountAmount?: number;
  shippingAmount?: number;
  taxAmount?: number;
  currency: string;
  customerEmail: string;
  customerPhone: string;
  customerFirstName?: string;
  customerLastName?: string;
  customerId?: string | null;
  itemsCount: number;
  createdAt: string;
}

export interface OrdersResponse {
  data: Order[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface OrderDetails {
  id: string;
  number: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  total: number;
  currency: string;
  totals?: {
    subtotal: number;
    discount: number;
    shipping: number;
    tax: number;
    total: number;
    currency: string;
  };
  customerEmail?: string;
  customerPhone?: string;
  customer?: {
    id: string;
    email: string | null;
    phone: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
  billingAddress?: any | null;
  shippingAddress?: any | null;
  shippingMethod?: string | null;
  notes?: string | null;
  adminNotes?: string | null;
  payment?: {
    id: string;
    provider: string;
    method?: string | null;
    amount: number;
    currency: string;
    status: string;
    cardLast4?: string | null;
    cardBrand?: string | null;
  } | null;
  items: Array<{
    id: string;
    productTitle: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    total: number;
    variantOptions?: Array<{
      attributeKey?: string;
      value?: string;
      label?: string;
      imageUrl?: string;
      colors?: string[] | any;
    }>;
  }>;
  createdAt: string;
  updatedAt?: string;
}

export function useOrders() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<CurrencyCode>(getStoredCurrency());
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [fulfillmentStatusFilter, setFulfillmentStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<OrdersResponse['meta'] | null>(null);
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [updatingStatuses, setUpdatingStatuses] = useState<Set<string>>(new Set());
  const [updatingPaymentStatuses, setUpdatingPaymentStatuses] = useState<Set<string>>(new Set());
  const [updatingFulfillmentStatuses, setUpdatingFulfillmentStatuses] = useState<Set<string>>(new Set());
  const [updateMessage, setUpdateMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);

  // Initialize filters from URL params on mount and when URL changes
  useEffect(() => {
    if (searchParams) {
      const status = searchParams.get('status') || '';
      const paymentStatus = searchParams.get('paymentStatus') || '';
      const fulfillmentStatus = searchParams.get('fulfillmentStatus') || '';
      const search = searchParams.get('search') || '';
      setStatusFilter(status);
      setPaymentStatusFilter(paymentStatus);
      setFulfillmentStatusFilter(fulfillmentStatus);
      setSearchQuery(search);
    }
  }, [searchParams]);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      console.log('📦 [ADMIN] Fetching orders...', {
        page,
        statusFilter,
        paymentStatusFilter,
        fulfillmentStatusFilter,
        searchQuery,
        sortBy,
        sortOrder,
      });
      
      const response = await apiClient.get<OrdersResponse>('/api/v1/admin/orders', {
        params: {
          page: page.toString(),
          limit: '20',
          status: statusFilter || '',
          paymentStatus: paymentStatusFilter || '',
          fulfillmentStatus: fulfillmentStatusFilter || '',
          search: searchQuery || '',
          sortBy: sortBy || '',
          sortOrder: sortOrder || '',
        },
      });

      console.log('✅ [ADMIN] Orders fetched:', response);
      setOrders(response.data || []);
      setMeta(response.meta || null);
    } catch (err) {
      console.error('❌ [ADMIN] Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, paymentStatusFilter, fulfillmentStatusFilter, searchQuery, sortBy, sortOrder]);

  // Initialize currency rates and listen for currency changes
  useEffect(() => {
    const updateCurrency = () => {
      const newCurrency = getStoredCurrency();
      console.log('💱 [ADMIN ORDERS] Currency updated to:', newCurrency);
      setCurrency(newCurrency);
    };
    
    // Initialize currency rates
    initializeCurrencyRates().catch(console.error);
    
    // Load currency on mount
    updateCurrency();
    
    // Listen for currency changes
    if (typeof window !== 'undefined') {
      window.addEventListener('currency-updated', updateCurrency);
      // Also listen for currency rates updates
      const handleCurrencyRatesUpdate = () => {
        console.log('💱 [ADMIN ORDERS] Currency rates updated, refreshing currency...');
        updateCurrency();
      };
      window.addEventListener('currency-rates-updated', handleCurrencyRatesUpdate);
      
      return () => {
        window.removeEventListener('currency-updated', updateCurrency);
        window.removeEventListener('currency-rates-updated', handleCurrencyRatesUpdate);
      };
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, paymentStatusFilter, fulfillmentStatusFilter, searchQuery, sortBy, sortOrder]);

  const formatCurrency: (amount: number, orderCurrency?: string, fromCurrency?: CurrencyCode) => string = (amount: number, orderCurrency: string = 'AMD', fromCurrency: CurrencyCode = 'USD') => {
    // Use the selected display currency instead of order currency
    const displayCurrency = currency;
    
    // Order subtotal and tax are stored in USD, but shipping and total are in AMD
    // We need to handle conversion based on the source currency
    if (displayCurrency === 'AMD') {
      if (fromCurrency === 'USD') {
        // Convert USD to AMD
        const convertedAmount = convertPrice(amount, 'USD', 'AMD');
        return formatPriceInCurrency(convertedAmount, 'AMD');
      } else {
        // Already in AMD, no conversion needed
        return formatPriceInCurrency(amount, 'AMD');
      }
    } else {
      // Convert from fromCurrency to display currency
      if (fromCurrency === 'USD') {
        // First convert USD to AMD, then to display currency
        const amdAmount = convertPrice(amount, 'USD', 'AMD');
        const convertedAmount = convertPrice(amdAmount, 'AMD', displayCurrency);
        return formatPriceInCurrency(convertedAmount, displayCurrency);
      } else {
        // Already in AMD, convert to display currency
        const convertedAmount = convertPrice(amount, 'AMD', displayCurrency);
        return formatPriceInCurrency(convertedAmount, displayCurrency);
      }
    }
  };


  const handleViewOrderDetails = async (orderId: string) => {
    setSelectedOrderId(orderId);
    setLoadingOrderDetails(true);
    try {
      const response = await apiClient.get<OrderDetails>(`/api/v1/admin/orders/${orderId}`);
      setOrderDetails(response);
    } catch (err: any) {
      console.error('❌ [ADMIN] Failed to load order details:', err);
      alert(err?.message || t('admin.orders.orderDetails.failedToLoad'));
      setSelectedOrderId(null);
    } finally {
      setLoadingOrderDetails(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedOrderId(null);
    setOrderDetails(null);
  };


  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (orders.length === 0) return;
    setSelectedIds(prev => {
      const allIds = orders.map(o => o.id);
      const hasAll = allIds.every(id => prev.has(id));
      return hasAll ? new Set() : new Set(allIds);
    });
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      // Toggle sort order if same column
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to descending
      setSortBy(column);
      setSortOrder('desc');
    }
    setPage(1); // Reset to first page when sorting changes
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(t('admin.orders.deleteConfirm').replace('{count}', selectedIds.size.toString()))) return;
    setBulkDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      console.log('🗑️ [ADMIN] Starting bulk delete for orders:', ids);
      
      const results = await Promise.allSettled(
        ids.map(async (id) => {
          try {
            const response = await apiClient.delete(`/api/v1/admin/orders/${id}`);
            console.log('✅ [ADMIN] Order deleted successfully:', id, response);
            return { id, success: true };
          } catch (error: any) {
            console.error('❌ [ADMIN] Failed to delete order:', id, error);
            return { id, success: false, error: error.message || t('admin.common.unknownErrorFallback') };
          }
        })
      );
      
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success));
      
      console.log('📊 [ADMIN] Bulk delete results:', {
        total: ids.length,
        successful: successful.length,
        failed: failed.length,
      });
      
      setSelectedIds(new Set());
      await fetchOrders();
      
      if (failed.length > 0) {
        const failedIds = failed.map(r => 
          r.status === 'fulfilled' ? r.value.id : 'unknown'
        );
        alert(t('admin.orders.bulkDeleteFailed').replace('{success}', successful.length.toString()).replace('{total}', ids.length.toString()).replace('{failed}', failedIds.join(', ')));
      } else {
        alert(t('admin.orders.bulkDeleteFinished').replace('{success}', successful.length.toString()).replace('{total}', ids.length.toString()));
      }
    } catch (err) {
      console.error('❌ [ADMIN] Bulk delete orders error:', err);
      alert(t('admin.orders.failedToDelete'));
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      console.log('📝 [ADMIN] Changing order status:', { orderId, newStatus });
      
      // Add to updating set
      setUpdatingStatuses((prev) => new Set(prev).add(orderId));
      setUpdateMessage(null);

      // Update order status via API
      await apiClient.put(`/api/v1/admin/orders/${orderId}`, {
        status: newStatus,
      });

      console.log('✅ [ADMIN] Order status updated successfully');

      // Update local state
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );

      // Show success message
      setUpdateMessage({ type: 'success', text: t('admin.orders.statusUpdated') });
      setTimeout(() => setUpdateMessage(null), 3000);
    } catch (err) {
      console.error('❌ [ADMIN] Error updating order status:', err);
      setUpdateMessage({ 
        type: 'error', 
        text: t('admin.orders.failedToUpdateStatus')
      });
      setTimeout(() => setUpdateMessage(null), 5000);
    } finally {
      // Remove from updating set
      setUpdatingStatuses((prev) => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };

  const handlePaymentStatusChange = async (orderId: string, newPaymentStatus: string) => {
    try {
      console.log('📝 [ADMIN] Changing order payment status:', { orderId, newPaymentStatus });
      
      // Add to updating set
      setUpdatingPaymentStatuses((prev) => new Set(prev).add(orderId));
      setUpdateMessage(null);

      // Update order payment status via API
      await apiClient.put(`/api/v1/admin/orders/${orderId}`, {
        paymentStatus: newPaymentStatus,
      });

      console.log('✅ [ADMIN] Order payment status updated successfully');

      // Update local state
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId ? { ...order, paymentStatus: newPaymentStatus } : order
        )
      );

      // Show success message
      setUpdateMessage({ type: 'success', text: t('admin.orders.paymentStatusUpdated') });
      setTimeout(() => setUpdateMessage(null), 3000);
    } catch (err) {
      console.error('❌ [ADMIN] Error updating order payment status:', err);
      setUpdateMessage({ 
        type: 'error', 
        text: t('admin.orders.failedToUpdatePaymentStatus')
      });
      setTimeout(() => setUpdateMessage(null), 5000);
    } finally {
      // Remove from updating set
      setUpdatingPaymentStatuses((prev) => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };

  const handleFulfillmentStatusChange = async (
    orderId: string,
    newFulfillmentStatus: string
  ) => {
    try {
      console.log('📝 [ADMIN] Changing order fulfillment status:', {
        orderId,
        newFulfillmentStatus,
      });
      setUpdatingFulfillmentStatuses((prev) => new Set(prev).add(orderId));
      setUpdateMessage(null);

      await apiClient.put(`/api/v1/admin/orders/${orderId}`, {
        fulfillmentStatus: newFulfillmentStatus,
      });

      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId
            ? { ...order, fulfillmentStatus: newFulfillmentStatus }
            : order
        )
      );

      setUpdateMessage({
        type: 'success',
        text: t('admin.orders.fulfillmentStatusUpdated'),
      });
      setTimeout(() => setUpdateMessage(null), 3000);
    } catch (err) {
      console.error('❌ [ADMIN] Error updating order fulfillment status:', err);
      setUpdateMessage({
        type: 'error',
        text: t('admin.orders.failedToUpdateFulfillmentStatus'),
      });
      setTimeout(() => setUpdateMessage(null), 5000);
    } finally {
      setUpdatingFulfillmentStatuses((prev) => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };

  return {
    // State
    orders,
    loading,
    currency,
    statusFilter,
    paymentStatusFilter,
    fulfillmentStatusFilter,
    searchQuery,
    page,
    meta,
    sortBy,
    sortOrder,
    updatingStatuses,
    updatingPaymentStatuses,
    updatingFulfillmentStatuses,
    updateMessage,
    selectedIds,
    bulkDeleting,
    selectedOrderId,
    orderDetails,
    loadingOrderDetails,
    // Actions
    setStatusFilter,
    setPaymentStatusFilter,
    setFulfillmentStatusFilter,
    setSearchQuery,
    setPage,
    fetchOrders,
    formatCurrency,
    handleViewOrderDetails,
    handleCloseModal,
    toggleSelect,
    toggleSelectAll,
    handleSort,
    handleBulkDelete,
    handleStatusChange,
    handlePaymentStatusChange,
    handleFulfillmentStatusChange,
    router,
    searchParams,
  };
}

