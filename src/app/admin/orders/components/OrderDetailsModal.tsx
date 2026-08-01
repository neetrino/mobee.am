'use client';

import { AnimatedModalPortal } from '@/components/AnimatedModalPortal';
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
 * Order details: centered dialog (~50vw), dimmed backdrop, portal to body.
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
    <AnimatedModalPortal
      isOpen={isOpen}
      onClose={onClose}
      closeAriaLabel={closeLabel}
      labelledBy="admin-order-details-title"
      dialogFrameClassName="fixed left-1/2 top-1/2 z-10 w-[min(calc(100vw-2rem),50vw)] min-w-[min(100%,20rem)] -translate-x-1/2 -translate-y-1/2"
      panelClassName="flex max-h-[min(85dvh,720px)] w-full flex-col overflow-hidden rounded-[20px] border border-admin-100 bg-white shadow-2xl"
    >
      {({ requestClose }) => (
        <>
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-admin-100 px-4 py-3 sm:px-5">
            <h2
              id="admin-order-details-title"
              className="min-w-0 flex-1 truncate text-base font-semibold text-gray-900 sm:text-lg"
            >
              {title}
            </h2>
            <button
              type="button"
              onClick={requestClose}
              className="shrink-0 rounded-full p-2 text-gray-500 transition-colors hover:bg-admin-50 hover:text-admin-700 focus:outline-none focus:ring-2 focus:ring-admin-400"
              aria-label={closeLabel}
            >
              <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5 sm:py-4">
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
          </div>
        </>
      )}
    </AnimatedModalPortal>
  );
}
