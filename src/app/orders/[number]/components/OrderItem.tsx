'use client';

import { useTranslation } from '../../../../lib/i18n-client';
import { formatPriceInCurrency, convertPrice } from '../../../../lib/currency';
import { getColorValue } from '../utils/color-helpers';
import type { OrderItem as OrderItemType } from '../types';

interface OrderItemProps {
  item: OrderItemType;
  currency: 'USD' | 'AMD' | 'EUR' | 'RUB' | 'GEL';
}

export function OrderItem({ item, currency }: OrderItemProps) {
  const { t } = useTranslation();

  const allOptions = item.variantOptions || [];

  const getAttributeLabel = (key: string): string => {
    if (key === 'color' || key === 'colour') return t('orders.itemDetails.color');
    if (key === 'size') return t('orders.itemDetails.size');
    return `${key.charAt(0).toUpperCase()}${key.slice(1)}:`;
  };

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

  const itemPriceDisplay = (() => {
    const priceAMD = convertPrice(item.price, 'USD', 'AMD');
    const priceDisplay = currency === 'AMD' ? priceAMD : convertPrice(priceAMD, 'AMD', currency);
    return formatPriceInCurrency(priceDisplay, currency);
  })();

  const itemTotalDisplay = (() => {
    const totalAMD = convertPrice(item.total, 'USD', 'AMD');
    const totalDisplay = currency === 'AMD' ? totalAMD : convertPrice(totalAMD, 'AMD', currency);
    return formatPriceInCurrency(totalDisplay, currency);
  })();

  return (
    <div className="flex gap-4 border-b border-gray-100 pb-6 last:border-0 last:pb-0">
      {item.imageUrl ? (
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100">
          <img
            src={item.imageUrl}
            alt={item.productTitle}
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <h3 className="text-lg font-semibold text-gray-900">{item.productTitle}</h3>

        {allOptions.length > 0 ? (
          <div className="mt-2 space-y-1">
            {allOptions.map((opt, optIndex) => {
              if (!opt.attributeKey || !opt.value) {
                return null;
              }

              const attributeKey = opt.attributeKey.toLowerCase().trim();
              const isColor = attributeKey === 'color' || attributeKey === 'colour';
              const displayLabel = opt.label || opt.value;
              const hasImage = Boolean(opt.imageUrl?.trim());
              const colors = getColorsArray(opt.colors);
              const colorHex =
                colors.length > 0 ? colors[0] : isColor ? getColorValue(opt.value) : null;

              return (
                <div key={optIndex} className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                  <span className="font-medium">{getAttributeLabel(opt.attributeKey)}</span>
                  {hasImage ? (
                    <img
                      src={opt.imageUrl!}
                      alt={displayLabel}
                      className="h-5 w-5 rounded border border-gray-300 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : isColor && colorHex ? (
                    <span
                      className="inline-block h-5 w-5 shrink-0 rounded-full border border-gray-300"
                      style={{ backgroundColor: colorHex }}
                      title={displayLabel}
                    />
                  ) : null}
                  <span className="text-gray-900 capitalize">{displayLabel}</span>
                </div>
              );
            })}
          </div>
        ) : null}

        <p className="mt-2 text-sm text-gray-500">{t('orders.itemDetails.sku').replace('{sku}', item.sku)}</p>
        <p className="mt-2 text-sm text-gray-600">
          {t('orders.itemDetails.quantity').replace('{qty}', String(item.quantity))}
        </p>
        <p className="text-sm text-gray-600">
          {t('orders.itemDetails.unitPrice').replace('{price}', itemPriceDisplay)}
        </p>
        <p className="text-sm font-semibold text-gray-900">
          {t('orders.itemDetails.lineTotal').replace('{total}', itemTotalDisplay)}
        </p>
      </div>
    </div>
  );
}
