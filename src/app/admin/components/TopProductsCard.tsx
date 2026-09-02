'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { resolveAdminProductThumbnailSrc } from '@/app/admin/admin-uniform-product-thumbnail.constants';
import { useTranslation } from '../../../lib/i18n-client';
import { formatCurrency } from '../utils/dashboardUtils';
import {
  ADMIN_DASH_CARD_CLASS,
  ADMIN_DASH_CARD_HOVER_CLASS,
} from '../dashboard-ui.constants';

interface TopProduct {
  variantId: string;
  productId: string;
  title: string;
  sku: string;
  totalQuantity: number;
  totalRevenue: number;
  orderCount: number;
  image?: string | null;
}

interface TopProductsCardProps {
  topProducts: TopProduct[];
  topProductsLoading: boolean;
}

export function TopProductsCard({ topProducts, topProductsLoading }: TopProductsCardProps) {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <div className={`${ADMIN_DASH_CARD_CLASS} p-4`}>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">{t('admin.dashboard.topSellingProducts')}</h2>
        <Link
          href="/supersudo/products"
          className="rounded-[12px] px-2 py-1 text-xs font-medium text-admin-600 hover:bg-admin-50"
        >
          {t('admin.dashboard.viewAll')}
        </Link>
      </div>
      <div className="space-y-2">
        {topProductsLoading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-[12px] bg-gray-100" />
          ))
        ) : topProducts.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-600">{t('admin.dashboard.noSalesData')}</p>
        ) : (
          topProducts.map((product, index) => (
            <button
              key={product.variantId}
              type="button"
              onClick={() => router.push(`/supersudo/products/add?id=${product.productId}`)}
              className={`flex w-full items-center gap-3 rounded-[12px] px-2.5 py-2 text-left ring-1 ring-gray-100/80 ${ADMIN_DASH_CARD_HOVER_CLASS}`}
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
                  {t('admin.dashboard.sold').replace('{count}', product.totalQuantity.toString())}
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold text-gray-900">
                {formatCurrency(product.totalRevenue, 'USD')}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
