'use client';

import { useTranslation } from '../../../lib/i18n-client';
import { useOrders } from './useOrders';
import { OrdersFilters } from './components/OrdersFilters';
import { BulkDeleteConfirmSheet } from './components/BulkDeleteConfirmSheet';
import { BulkSelectionControls } from './components/BulkSelectionControls';
import { OrdersTable } from './components/OrdersTable';
import { OrderDetailsModal } from './components/OrderDetailsModal';
import { AdminPageShell } from '../components/AdminPageShell';

export function OrdersPageContent() {
  const { t } = useTranslation();
  const {
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
    updateMessage,
    selectedIds,
    bulkDeleting,
    bulkDeleteConfirmOpen,
    selectedOrderId,
    orderDetails,
    loadingOrderDetails,
    setStatusFilter,
    setPaymentStatusFilter,
    setFulfillmentStatusFilter,
    setSearchQuery,
    setPage,
    formatCurrency,
    handleViewOrderDetails,
    handleCloseModal,
    toggleSelect,
    toggleSelectAll,
    handleSort,
    openBulkDeleteConfirm,
    closeBulkDeleteConfirm,
    executeBulkDelete,
    handleStatusChange,
    handlePaymentStatusChange,
    router,
    searchParams,
  } = useOrders();

  return (
    <AdminPageShell currentPath="/supersudo/orders" router={router} t={t}>
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('admin.orders.title')}</h1>
        </div>

        <OrdersFilters
          statusFilter={statusFilter}
          paymentStatusFilter={paymentStatusFilter}
          fulfillmentStatusFilter={fulfillmentStatusFilter}
          searchQuery={searchQuery}
          updateMessage={updateMessage}
          setStatusFilter={setStatusFilter}
          setPaymentStatusFilter={setPaymentStatusFilter}
          setFulfillmentStatusFilter={setFulfillmentStatusFilter}
          setSearchQuery={setSearchQuery}
          setPage={setPage}
          router={router}
          searchParams={searchParams}
        />

        <BulkSelectionControls
          selectedCount={selectedIds.size}
          onBulkDelete={openBulkDeleteConfirm}
          bulkDeleting={bulkDeleting}
        />

        <BulkDeleteConfirmSheet
          isOpen={bulkDeleteConfirmOpen}
          title={t('admin.orders.deleteSelected')}
          closeLabel={t('admin.common.close')}
          selectedCount={selectedIds.size}
          bulkDeleting={bulkDeleting}
          onCancel={closeBulkDeleteConfirm}
          onConfirm={() => {
            void executeBulkDelete();
          }}
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
    </AdminPageShell>
  );
}
