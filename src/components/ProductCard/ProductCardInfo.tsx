'use client';

import Link from 'next/link';
import { formatPrice } from '../../lib/currency';
import { useTranslation } from '../../lib/i18n-client';
import { ProductColors } from './ProductColors';
import type { CurrencyCode } from '../../lib/currency';

interface ProductCardInfoProps {
  slug: string;
  title: string;
  brandName?: string | null;
  price: number;
  originalPrice?: number | null;
  compareAtPrice?: number | null;
  discountPercent?: number | null;
  currency: CurrencyCode;
  colors?: Array<{ value: string; imageUrl?: string | null; colors?: string[] | null }>;
  isCompact?: boolean;
}

/**
 * Component for displaying product information (title, brand, price, colors)
 */
export function ProductCardInfo({
  slug,
  title,
  brandName,
  price,
  originalPrice,
  compareAtPrice,
  discountPercent,
  currency,
  colors,
  isCompact = false,
}: ProductCardInfoProps) {
  const { t } = useTranslation();

  return (
    <div className={isCompact ? 'p-2.5' : 'p-4'}>
      <Link href={`/products/${slug}`} className="block">
        {/* Product Title */}
        <h3 className={`${isCompact ? 'text-base' : 'text-xl'} font-medium text-gray-900 ${isCompact ? 'mb-0.5' : 'mb-1'} line-clamp-2`}>
          {title}
        </h3>
        
        {/* Category - Using brand name as category or default */}
        <p className={`${isCompact ? 'text-sm' : 'text-lg'} text-gray-500 ${isCompact ? 'mb-1' : 'mb-2'}`}>
          {brandName || t('common.defaults.category')}
        </p>
      </Link>

      {/* Available Colors */}
      {colors && colors.length > 0 && (
        <ProductColors colors={colors} isCompact={isCompact} />
      )}

      {/* Price */}
      <div className={`mt-2 flex items-center justify-between ${isCompact ? 'gap-2' : 'gap-4'}`}>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className={`${isCompact ? 'text-lg' : 'text-2xl'} font-semibold text-gray-900`}>
              {formatPrice(price || 0, currency)}
            </span>
            {discountPercent && discountPercent > 0 ? (
              <span className={`${isCompact ? 'text-xs' : 'text-sm'} font-semibold text-blue-600`}>
                -{discountPercent}%
              </span>
            ) : null}
          </div>
          {(originalPrice && originalPrice > price) || 
           (compareAtPrice && compareAtPrice > price) ? (
            <span className={`${isCompact ? 'text-sm' : 'text-lg'} text-gray-500 line-through`}>
              {formatPrice(
                (originalPrice && originalPrice > price) 
                  ? originalPrice 
                  : (compareAtPrice || 0), 
                currency
              )}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}




