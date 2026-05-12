'use client';

import { useEffect } from 'react';
import { useTranslation } from '../../../../lib/i18n-client';
import { CurrencyCode } from '../../../../lib/currency';
import { acquireBodyScrollLock } from '../../../../lib/body-scroll-lock';
import { OrderDetailsSummary } from './OrderDetailsSummary';
import { OrderDetailsAddresses } from './OrderDetailsAddresses';
import { OrderDetailsTotals } from './OrderDetailsTotals';
import { OrderDetailsItems } from './OrderDetailsItems';
import type { OrderDetails } from '../useOrders';

interface OrderDetailsModalProps {
  orderDetails: OrderDetails | null;
  loading: boolean;
  currency: string;
  onClose: () => void;
  formatCurrency: (amount: number, orderCurrency?: string, fromCurrency?: CurrencyCode) => string;
}

/**
 * Order details: full-width bottom sheet (mt-auto), no dimmed backdrop (tap outside closes).
 */
export function OrderDetailsModal({
  orderDetails,
  loading,
  currency,
  onClose,
  formatCurrency,
}: OrderDetailsModalProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!orderDetails) {
      return;
    }
    return acquireBodyScrollLock();
  }, [orderDetails]);

  useEffect(() => {
    if (!orderDetails) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [orderDetails, onClose]);

  if (!orderDetails) {
    return null;
  }

  const title = `${t('admin.orders.orderDetails.title')} #${orderDetails.number}`;

  return (
    <div className="fixed inset-0 z-[90] flex flex-col">
      <button
        type="button"
        className="absolute inset-0 bg-transparent"
        aria-label={t('admin.common.close')}
        onClick={onClose}
      />
      <div className="relative z-10 mt-auto w-full max-w-full px-0">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-order-details-title"
          className="flex h-[min(94dvh,calc(100dvh-env(safe-area-inset-bottom)-0.5rem))] w-full max-w-full flex-col overflow-hidden rounded-t-[20px] border border-admin-100 bg-white shadow-2xl ring-1 ring-gray-200/60 sm:rounded-t-[24px]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-admin-100 px-3 py-2.5 sm:px-5 sm:py-3">
            <h2
              id="admin-order-details-title"
              className="min-w-0 flex-1 truncate text-base font-semibold text-gray-900 sm:text-lg"
            >
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-full p-2 text-gray-500 transition-colors hover:bg-admin-50 hover:text-admin-700 focus:outline-none focus:ring-2 focus:ring-admin-400"
              aria-label={t('admin.common.close')}
            >
              <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-5 sm:py-4">
            {loading ? (
              <div className="py-8 text-center">
                <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-b-2 border-admin" />
                <p className="text-sm text-gray-600">{t('admin.orders.orderDetails.loadingOrderDetails')}</p>
              </div>
            ) : (
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
