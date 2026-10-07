'use client';

import { AdminSideSheet } from '../../components/AdminSideSheet';
import { useTranslation } from '../../../../lib/i18n-client';
import { CurrencyCode } from '../../../../lib/currency';
import { OrderDetailsSummary } from './OrderDetailsSummary';
import { OrderDetailsAddresses } from './OrderDetailsAddresses';
import { OrderDetailsTotals } from './OrderDetailsTotals';
import { OrderDetailsItems } from './OrderDetailsItems';
import type { OrderDetails } from '../useOrders';

interface OrderDetailsModalProps {
  isOpen: boolean;
  orderDetails: OrderDetails | null;
  loading: boolean;
  currency: string;
  onClose: () => void;
  formatCurrency: (amount: number, orderCurrency?: string, fromCurrency?: CurrencyCode) => string;
}

/**
 * Order details in a right side sheet.
 */
export function OrderDetailsModal({
  isOpen,
  orderDetails,
  loading,
  currency,
  onClose,
  formatCurrency,
}: OrderDetailsModalProps) {
  const { t } = useTranslation();
  const closeLabel = t('admin.common.close');
  const title = orderDetails
    ? `${t('admin.orders.orderDetails.title')} #${orderDetails.number}`
    : t('admin.orders.orderDetails.title');

  return (
    <AdminSideSheet
      open={isOpen}
      onClose={onClose}
      title={title}
      closeLabel={closeLabel}
      desktopWidthClassName="lg:w-[50%]"
    >
            {loading ? (
              <div className="py-8 text-center">
                <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-b-2 border-admin" />
                <p className="text-sm text-gray-600">{t('admin.orders.orderDetails.loadingOrderDetails')}</p>
              </div>
            ) : orderDetails ? (
              <div className="space-y-4 sm:space-y-5">
                <OrderDetailsSummary
                  orderDetails={orderDetails}
                  currency={currency}
                  formatCurrency={formatCurrency}
                />
                <OrderDetailsAddresses orderDetails={orderDetails} formatCurrency={formatCurrency} />
                <OrderDetailsTotals
                  orderDetails={orderDetails}
                  currency={currency}
                  formatCurrency={formatCurrency}
                />
                <OrderDetailsItems orderDetails={orderDetails} formatCurrency={formatCurrency} />
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-gray-600">
                {t('admin.orders.orderDetails.failedToLoad')}
              </div>
            )}
    </AdminSideSheet>
  );
}
