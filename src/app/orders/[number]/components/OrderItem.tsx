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
    return key.charAt(0).toUpperCase() + key.slice(1);
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
    <div className="flex gap-4 pb-4 border-b border-gray-200 last:border-0">
      {item.imageUrl && (
        <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
          <img 
            src={item.imageUrl} 
            alt={item.productTitle}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{item.productTitle}</h3>
        
        {allOptions.length > 0 && (
          <div className="flex flex-wrap gap-3 mt-2 mb-2">
            {allOptions.map((opt, optIndex) => {
              if (!opt.attributeKey || !opt.value) return null;
              
              const attributeKey = opt.attributeKey.toLowerCase().trim();
              const isColor = attributeKey === 'color' || attributeKey === 'colour';
              const displayLabel = opt.label || opt.value;
              const hasImage = opt.imageUrl && opt.imageUrl.trim() !== '';
              const colors = getColorsArray(opt.colors);
              const colorHex = colors.length > 0 ? colors[0] : (isColor ? getColorValue(opt.value) : null);
              
              return (
                <div key={optIndex} className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">
                    {getAttributeLabel(opt.attributeKey)}:
                  </span>
                  <div className="flex items-center gap-2">
                    {hasImage ? (
                      <img 
                        src={opt.imageUrl!} 
                        alt={displayLabel}
                        className="w-6 h-6 rounded border border-gray-300 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : isColor && colorHex ? (
                      <div 
                        className="w-5 h-5 rounded-full border border-gray-300"
                        style={{ backgroundColor: colorHex }}
                        title={displayLabel}
                      />
                    ) : null}
                    <span className="text-sm text-gray-900 capitalize">
                      {displayLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        <p className="text-sm text-gray-600">{t('orders.itemDetails.sku').replace('{sku}', item.sku)}</p>
        <p className="text-sm text-gray-600 mt-2">
          {t('orders.itemDetails.quantity')
            .replace('{qty}', item.quantity.toString())
            .replace('{price}', itemPriceDisplay)
            .replace('{total}', itemTotalDisplay)}
        </p>
      </div>
    </div>
  );
}




