'use client';

import { useTranslation } from '../../../lib/i18n-client';
import { useOrders } from './useOrders';
import { OrdersFilters } from './components/OrdersFilters';
import { BulkSelectionControls } from './components/BulkSelectionControls';
import { OrdersTable } from './components/OrdersTable';
import { OrderDetailsModal } from './components/OrderDetailsModal';

export function OrdersPageContent() {
  const { t } = useTranslation();
  const {
    orders,
    loading,
    currency,
    statusFilter,
    paymentStatusFilter,
    searchQuery,
    page,
    meta,
    sortBy,
    sortOrder,
    updatingStatuses,
    updatingPaymentStatuses,
    updateMessage,
    selectedIds,
    bulkDeleting,
    selectedOrderId,
    orderDetails,
    loadingOrderDetails,
    setStatusFilter,
    setPaymentStatusFilter,
    setSearchQuery,
    setPage,
    formatCurrency,
    handleViewOrderDetails,
    handleCloseModal,
    toggleSelect,
    toggleSelectAll,
    handleSort,
    handleBulkDelete,
    handleStatusChange,
    handlePaymentStatusChange,
    router,
    searchParams,
  } = useOrders();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin')}
            className="text-gray-600 hover:text-gray-900 mb-4 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('admin.orders.backToAdmin')}
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{t('admin.orders.title')}</h1>
        </div>

        <OrdersFilters
          statusFilter={statusFilter}
          paymentStatusFilter={paymentStatusFilter}
          searchQuery={searchQuery}
          updateMessage={updateMessage}
          setStatusFilter={setStatusFilter}
          setPaymentStatusFilter={setPaymentStatusFilter}
          setSearchQuery={setSearchQuery}
          setPage={setPage}
          router={router}
          searchParams={searchParams}
        />

        <BulkSelectionControls
          selectedCount={selectedIds.size}
          onBulkDelete={handleBulkDelete}
          bulkDeleting={bulkDeleting}
        />

        <OrdersTable
          orders={orders}
          loading={loading}
          selectedIds={selectedIds}
          updatingStatuses={updatingStatuses}
          updatingPaymentStatuses={updatingPaymentStatuses}
          sortBy={sortBy}
          sortOrder={sortOrder}
          page={page}
          meta={meta}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
          onSort={handleSort}
          onViewDetails={handleViewOrderDetails}
          onStatusChange={handleStatusChange}
          onPaymentStatusChange={handlePaymentStatusChange}
          onPageChange={(newPage) => setPage(newPage)}
          formatCurrency={formatCurrency}
        />

        {selectedOrderId && (
          <OrderDetailsModal
            orderDetails={orderDetails}
            loading={loadingOrderDetails}
            currency={currency}
            onClose={handleCloseModal}
            formatCurrency={formatCurrency}
          />
        )}
      </div>
    </div>
  );
}
