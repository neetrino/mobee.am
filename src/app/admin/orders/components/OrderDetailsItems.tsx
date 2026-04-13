'use client';

import { useTranslation } from '../../../../lib/i18n-client';
import { Card } from '@shop/ui';
import { CurrencyCode } from '../../../../lib/currency';
import { getColorValue } from '../utils/orderUtils';
import type { OrderDetails } from '../useOrders';

interface OrderDetailsItemsProps {
  orderDetails: OrderDetails;
  formatCurrency: (amount: number, orderCurrency?: string, fromCurrency?: CurrencyCode) => string;
}

export function OrderDetailsItems({
  orderDetails,
  formatCurrency,
}: OrderDetailsItemsProps) {
  const { t } = useTranslation();

  const getColorsArray = (colors: unknown): string[] => {
    if (!colors) return [];
    if (Array.isArray(colors)) return colors;
    if (typeof colors === 'string') {
      try {
        const parsed = JSON.parse(colors);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  if (!Array.isArray(orderDetails.items) || orderDetails.items.length === 0) {
    return (
      <Card className="p-4 md:p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('admin.orders.orderDetails.items')}</h3>
        <div className="text-sm text-gray-500">{t('admin.orders.orderDetails.noItemsFound')}</div>
      </Card>
    );
  }

  return (
    <Card className="p-4 md:p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('admin.orders.orderDetails.items')}</h3>
      <div className="overflow-x-auto border border-gray-200 rounded-md">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-500">{t('admin.orders.orderDetails.product')}</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">{t('admin.orders.orderDetails.sku')}</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">{t('admin.orders.orderDetails.colorSize')}</th>
              <th className="px-3 py-2 text-right font-medium text-gray-500">{t('admin.orders.orderDetails.qty')}</th>
              <th className="px-3 py-2 text-right font-medium text-gray-500">{t('admin.orders.orderDetails.price')}</th>
              <th className="px-3 py-2 text-right font-medium text-gray-500">{t('admin.orders.orderDetails.totalCol')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {orderDetails.items.map((item) => {
              const allOptions = item.variantOptions || [];
              return (
                <tr key={item.id}>
                  <td className="px-3 py-2">{item.productTitle}</td>
                  <td className="px-3 py-2 text-gray-500">{item.sku}</td>
                  <td className="px-3 py-2">
                    {allOptions.length > 0 ? (
                      <div className="flex flex-wrap gap-2 items-center">
                        {allOptions.map((opt, optIndex) => {
                          if (!opt.attributeKey || !opt.value) return null;
                          const attributeKey = opt.attributeKey.toLowerCase().trim();
                          const isColor = attributeKey === 'color' || attributeKey === 'colour';
                          const displayLabel = opt.label || opt.value;
                          const hasImage = opt.imageUrl && opt.imageUrl.trim() !== '';
                          const colors = getColorsArray(opt.colors);
                          const colorHex = colors.length > 0 ? colors[0] : (isColor ? getColorValue(opt.value) : null);
                          return (
                            <div key={optIndex} className="flex items-center gap-1.5">
                              {hasImage ? (
                                <img
                                  src={opt.imageUrl!}
                                  alt={displayLabel}
                                  className="w-4 h-4 rounded border border-gray-300 object-cover flex-shrink-0"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              ) : isColor && colorHex ? (
                                <div
                                  className="w-4 h-4 rounded-full border border-gray-300 flex-shrink-0"
                                  style={{ backgroundColor: colorHex }}
                                  title={displayLabel}
                                />
                              ) : null}
                              <span className="text-xs text-gray-700 capitalize">{displayLabel}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">{item.quantity}</td>
                  <td className="px-3 py-2 text-right">
                    {formatCurrency(item.unitPrice, orderDetails.currency || 'AMD', 'USD')}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatCurrency(item.total, orderDetails.currency || 'AMD', 'USD')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

