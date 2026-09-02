'use client';

import { resolveAdminProductThumbnailSrc } from '@/app/admin/admin-uniform-product-thumbnail.constants';
import { useTranslation } from '../../../../lib/i18n-client';
import { formatCurrency } from '../utils';
import type { AnalyticsData } from '../types';
import {
  ADMIN_DASH_CARD_CLASS,
  ADMIN_DASH_CARD_HOVER_CLASS,
} from '../../dashboard-ui.constants';

interface TopProductsProps {
  products: AnalyticsData['topProducts'];
  currency: string;
}

export function TopProducts({ products, currency }: TopProductsProps) {
  const { t } = useTranslation();

  return (
    <div className={`${ADMIN_DASH_CARD_CLASS} p-4`}>
      <h2 className="mb-2 text-base font-semibold text-gray-900">{t('admin.analytics.topSellingProducts')}</h2>
      <div className="space-y-2">
        {products.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-600">{t('admin.analytics.noSalesDataAvailable')}</p>
        ) : (
          products.map((product, index) => (
            <div
              key={product.variantId}
              className={`flex items-center gap-3 rounded-[12px] px-2.5 py-2 ring-1 ring-gray-100/80 ${ADMIN_DASH_CARD_HOVER_CLASS}`}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[11px] font-bold text-amber-900">
                {index + 1}
              </div>
              <img
                src={resolveAdminProductThumbnailSrc(product.image)}
                alt={product.title}
                className="h-10 w-10 shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{product.title}</p>
                <p className="text-[11px] text-gray-500">
                  {product.totalQuantity} {t('admin.analytics.sold')} · {product.orderCount}{' '}
                  {t('admin.analytics.orders')}
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold text-gray-900">
                {formatCurrency(product.totalRevenue, currency)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
