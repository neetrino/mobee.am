'use client';

import { Card } from '@shop/ui';
import { useTranslation } from '../../../../lib/i18n-client';
import { LineChart } from '../LineChart';
import { formatCurrency, formatDateShort } from '../utils';
import type { AnalyticsData } from '../types';

interface OrdersByDayChartProps {
  ordersByDay: AnalyticsData['ordersByDay'];
}

export function OrdersByDayChart({ ordersByDay }: OrdersByDayChartProps) {
  const { t } = useTranslation();

  return (
    <Card className="p-8 bg-white shadow-lg border border-gray-200 rounded-2xl hover:shadow-xl transition-shadow duration-300">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('admin.analytics.ordersByDay')}</h2>
          <p className="text-sm text-gray-500 font-medium">{t('admin.analytics.dailyOrderTrends')}</p>
        </div>
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
      </div>
      
      {ordersByDay.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-500">{t('admin.analytics.noDataAvailable')}</p>
        </div>
      ) : (
        <>
          {/* SVG Line Chart - Modern Container */}
          <div className="mb-8 bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 border border-gray-100 shadow-inner">
            <LineChart data={ordersByDay} />
          </div>
          
          {/* Detailed List - Modern Design */}
          <div className="space-y-3">
            {ordersByDay.map((day) => {
              const maxCount = Math.max(...ordersByDay.map(d => d.count), 1);
              const percentage = (day.count / maxCount) * 100;
              
              return (
                <div 
                  key={day._id} 
                  className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all duration-300 group"
                >
                  <div className="w-32 text-sm font-semibold text-gray-700 flex-shrink-0">
                    {formatDateShort(day._id)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 bg-gray-200 rounded-full h-10 relative overflow-hidden shadow-inner">
                        <div
                          className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 h-10 rounded-full flex items-center justify-between px-4 transition-all duration-700 group-hover:shadow-lg"
                          style={{ width: `${percentage}%` }}
                        >
                          <span className="text-xs text-white font-bold">{t('admin.analytics.ordersLabel').replace('{count}', day.count.toString())}</span>
                          <div className="w-2 h-2 bg-white rounded-full opacity-80"></div>
                        </div>
                      </div>
                      <div className="w-36 text-right flex-shrink-0">
                        <p className="text-sm font-bold text-gray-900">
                          {formatCurrency(day.revenue)}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{t('admin.analytics.revenue')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Card>
  );
}




