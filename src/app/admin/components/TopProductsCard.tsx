'use client';

import { Card, Button } from '@shop/ui';
import { useRouter } from 'next/navigation';
import { useTranslation } from '../../../lib/i18n-client';
import { formatCurrency } from '../utils/dashboardUtils';

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
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">{t('admin.dashboard.topSellingProducts')}</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/admin/products')}
        >
          {t('admin.dashboard.viewAll')}
        </Button>
      </div>
      <div className="space-y-4">
        {topProductsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : topProducts.length === 0 ? (
          <div className="text-sm text-gray-600 text-center py-8">
            <p>{t('admin.dashboard.noSalesData')}</p>
          </div>
        ) : (
          topProducts.map((product, index) => (
            <div
              key={product.variantId}
              className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => router.push(`/admin/products/${product.productId}`)}
            >
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-xs font-bold text-gray-500">
                  {index + 1}
                </div>
              </div>
              {product.image && (
                <div className="flex-shrink-0">
                  <img
                    src={product.image}
                    alt={product.title}
                    className="w-12 h-12 object-cover rounded"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{product.title}</p>
                <p className="text-xs text-gray-600">SKU: {product.sku}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {t('admin.dashboard.sold').replace('{count}', product.totalQuantity.toString())} • {t('admin.dashboard.orders').replace('{count}', product.orderCount.toString())}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">
                  {formatCurrency(product.totalRevenue, 'USD')}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

