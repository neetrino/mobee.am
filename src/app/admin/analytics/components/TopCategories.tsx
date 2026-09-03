'use client';

import { useTranslation } from '../../../../lib/i18n-client';
import { formatCurrency } from '../utils';
import type { AnalyticsData } from '../types';
import {
  ADMIN_DASH_CARD_CLASS,
  ADMIN_DASH_CARD_HOVER_CLASS,
} from '../../dashboard-ui.constants';

interface TopCategoriesProps {
  categories: AnalyticsData['topCategories'];
  currency: string;
}

export function TopCategories({ categories, currency }: TopCategoriesProps) {
  const { t } = useTranslation();

  return (
    <div className={`${ADMIN_DASH_CARD_CLASS} p-4`}>
      <h2 className="mb-2 text-base font-semibold text-gray-900">{t('admin.analytics.topCategories')}</h2>
      <div className="space-y-2">
        {categories.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-600">
            {t('admin.analytics.noCategoryDataAvailable')}
          </p>
        ) : (
          categories.map((category, index) => (
            <div
              key={category.categoryId}
              className={`flex items-center gap-3 rounded-[12px] px-2.5 py-2 ring-1 ring-gray-100/80 ${ADMIN_DASH_CARD_HOVER_CLASS}`}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-admin-100 text-[11px] font-bold text-admin-700">
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{category.categoryName}</p>
                <p className="text-[11px] text-gray-500">
                  {category.totalQuantity} {t('admin.analytics.items')} · {category.orderCount}{' '}
                  {t('admin.analytics.orders')}
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold text-gray-900">
                {formatCurrency(category.totalRevenue, currency)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
