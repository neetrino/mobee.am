'use client';

import { Card } from '@shop/ui';
import { useTranslation } from '../../../../lib/i18n-client';
import { formatCurrency } from '../utils';
import type { AnalyticsData } from '../types';

interface TopCategoriesProps {
  categories: AnalyticsData['topCategories'];
}

export function TopCategories({ categories }: TopCategoriesProps) {
  const { t } = useTranslation();

  return (
    <Card className="p-6 bg-white shadow-sm border border-gray-200 rounded-xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">{t('admin.analytics.topCategories')}</h2>
        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        </div>
      </div>
      <div className="space-y-3">
        {categories.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">{t('admin.analytics.noCategoryDataAvailable')}</p>
          </div>
        ) : (
          categories.map((category, index) => (
            <div
              key={category.categoryId}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-purple-300 hover:shadow-md transition-all duration-200 bg-gray-50 hover:bg-white group"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold transition-colors ${
                  index === 0 ? 'bg-purple-400 text-purple-900' :
                  index === 1 ? 'bg-gray-300 text-gray-700' :
                  index === 2 ? 'bg-pink-300 text-pink-900' :
                  'bg-gray-200 text-gray-600'
                }`}>
                  {index + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-1">{category.categoryName}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      {t('admin.analytics.items').replace('{count}', category.totalQuantity.toString())}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      {t('admin.analytics.orders').replace('{count}', category.orderCount.toString())}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-base font-bold text-gray-900">
                  {formatCurrency(category.totalRevenue)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}




