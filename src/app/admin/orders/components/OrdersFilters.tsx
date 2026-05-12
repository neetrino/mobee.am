'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from '../../../../lib/i18n-client';
import { Search } from 'lucide-react';
import { Card } from '@/app/admin/lib/adminShopUi';
import type { useOrders } from '../useOrders';
import { OrdersFilterDropdown } from './OrdersFilterDropdown';

interface OrdersFiltersProps {
  statusFilter: string;
  paymentStatusFilter: string;
  fulfillmentStatusFilter: string;
  searchQuery: string;
  updateMessage: { type: 'success' | 'error'; text: string } | null;
  setStatusFilter: (value: string) => void;
  setPaymentStatusFilter: (value: string) => void;
  setFulfillmentStatusFilter: (value: string) => void;
  setSearchQuery: (value: string) => void;
  setPage: (value: number | ((prev: number) => number)) => void;
  router: ReturnType<typeof useOrders>['router'];
  searchParams: ReturnType<typeof useOrders>['searchParams'];
}

type OpenOrdersFilterMenu = 'status' | 'payment' | 'fulfillment' | null;

export function OrdersFilters({
  statusFilter,
  paymentStatusFilter,
  fulfillmentStatusFilter,
  searchQuery,
  updateMessage,
  setStatusFilter,
  setPaymentStatusFilter,
  setFulfillmentStatusFilter,
  setSearchQuery,
  setPage,
  router,
  searchParams,
}: OrdersFiltersProps) {
  const { t } = useTranslation();
  const [openMenu, setOpenMenu] = useState<OpenOrdersFilterMenu>(null);
  const [searchDraft, setSearchDraft] = useState(searchQuery);
  const filtersBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearchDraft(searchQuery);
  }, [searchQuery]);

  const statusOptions = useMemo(
    () =>
      [
        { value: '', label: t('admin.orders.allStatuses') },
        { value: 'pending', label: t('admin.orders.pending') },
        { value: 'processing', label: t('admin.orders.processing') },
        { value: 'completed', label: t('admin.orders.completed') },
        { value: 'cancelled', label: t('admin.orders.cancelled') },
      ] as const,
    [t],
  );

  const paymentOptions = useMemo(
    () =>
      [
        { value: '', label: t('admin.orders.allPaymentStatuses') },
        { value: 'paid', label: t('admin.orders.paid') },
        { value: 'pending', label: t('admin.orders.pendingPayment') },
        { value: 'failed', label: t('admin.orders.failed') },
      ] as const,
    [t],
  );

  const fulfillmentOptions = useMemo(
    () =>
      [
        { value: '', label: t('admin.orders.allFulfillmentStatuses') },
        { value: 'unfulfilled', label: t('admin.orders.unfulfilled') },
        { value: 'fulfilled', label: t('admin.orders.fulfilled') },
        { value: 'shipped', label: t('admin.orders.shipped') },
        { value: 'delivered', label: t('admin.orders.delivered') },
      ] as const,
    [t],
  );

  useEffect(() => {
    if (!openMenu) {
      return;
    }
    const handlePointerDown = (event: MouseEvent) => {
      const root = filtersBarRef.current;
      if (root && !root.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [openMenu]);

  const handleStatusChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    setPage(1);
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (newStatus) {
      params.set('status', newStatus);
    } else {
      params.delete('status');
    }
    const newUrl = params.toString() ? `/supersudo/orders?${params.toString()}` : '/supersudo/orders';
    router.push(newUrl, { scroll: false });
  };

  const handlePaymentStatusChange = (newPaymentStatus: string) => {
    setPaymentStatusFilter(newPaymentStatus);
    setPage(1);
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (newPaymentStatus) {
      params.set('paymentStatus', newPaymentStatus);
    } else {
      params.delete('paymentStatus');
    }
    const newUrl = params.toString() ? `/supersudo/orders?${params.toString()}` : '/supersudo/orders';
    router.push(newUrl, { scroll: false });
  };

  const handleSearchChange = (newSearch: string) => {
    setSearchQuery(newSearch);
    setPage(1);
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (newSearch.trim()) {
      params.set('search', newSearch.trim());
    } else {
      params.delete('search');
    }
    const newUrl = params.toString() ? `/supersudo/orders?${params.toString()}` : '/supersudo/orders';
    router.push(newUrl, { scroll: false });
  };

  const handleSearchSubmit = (event: FormEvent) => {
    event.preventDefault();
    handleSearchChange(searchDraft);
  };

  const handleFulfillmentStatusChange = (newFulfillmentStatus: string) => {
    setFulfillmentStatusFilter(newFulfillmentStatus);
    setPage(1);
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (newFulfillmentStatus) {
      params.set('fulfillmentStatus', newFulfillmentStatus);
    } else {
      params.delete('fulfillmentStatus');
    }
    const newUrl = params.toString() ? `/supersudo/orders?${params.toString()}` : '/supersudo/orders';
    router.push(newUrl, { scroll: false });
  };

  return (
    <Card className="mb-6 p-3">
      <div ref={filtersBarRef} className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <OrdersFilterDropdown
            id="orders-filter-status"
            isOpen={openMenu === 'status'}
            onOpenChange={(open) => setOpenMenu(open ? 'status' : null)}
            value={statusFilter}
            onValueChange={handleStatusChange}
            options={statusOptions}
            ariaLabel={t('admin.orders.filterStatusAria')}
          />
          <OrdersFilterDropdown
            id="orders-filter-payment"
            isOpen={openMenu === 'payment'}
            onOpenChange={(open) => setOpenMenu(open ? 'payment' : null)}
            value={paymentStatusFilter}
            onValueChange={handlePaymentStatusChange}
            options={paymentOptions}
            ariaLabel={t('admin.orders.filterPaymentAria')}
          />
          <OrdersFilterDropdown
            id="orders-filter-fulfillment"
            isOpen={openMenu === 'fulfillment'}
            onOpenChange={(open) => setOpenMenu(open ? 'fulfillment' : null)}
            value={fulfillmentStatusFilter}
            onValueChange={handleFulfillmentStatusChange}
            options={fulfillmentOptions}
            ariaLabel={t('admin.orders.filterFulfillmentAria')}
          />
          <form
            onSubmit={handleSearchSubmit}
            className="flex min-w-0 w-full flex-1 basis-full gap-1.5 sm:min-w-[12rem] sm:basis-[min(100%,18rem)] sm:flex-1 md:max-w-sm"
          >
            <input
              type="search"
              name="orders-search"
              autoComplete="off"
              placeholder={t('admin.orders.searchPlaceholder')}
              className="h-10 min-h-10 min-w-0 flex-1 rounded-supersudo border border-gray-300 px-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-admin"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
            />
            <button
              type="submit"
              aria-label={t('admin.orders.search')}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-supersudo bg-admin-500 text-white shadow-sm transition-opacity hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-600 active:opacity-90"
            >
              <Search className="h-5 w-5" aria-hidden strokeWidth={2} />
            </button>
          </form>
        </div>
        {updateMessage ? (
          <div
            className={`rounded-supersudo px-3 py-1.5 text-sm ${
              updateMessage.type === 'success'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {updateMessage.text}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
