'use client';

import Link from 'next/link';
import { formatPrice } from '../../lib/currency';
import { useTranslation } from '../../lib/i18n-client';
import { ProductColors } from './ProductColors';
import type { CurrencyCode } from '../../lib/currency';

interface ProductCardInfoProps {
  slug: string;
  title: string;
  subtitle?: string | null;
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
  subtitle,
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
        {/* Product line (Figma: small caps category) */}
        <p
          className={`${isCompact ? 'text-[9px]' : 'text-[10px]'} font-bold uppercase tracking-[0.08em] text-gray-400 ${isCompact ? 'mb-0.5' : 'mb-1'}`}
        >
          {brandName || t('common.defaults.category')}
        </p>
        <h3
          className={`${isCompact ? 'text-base' : 'text-xl'} font-medium text-gray-900 line-clamp-2 ${subtitle ? (isCompact ? 'mb-0.5' : 'mb-1') : isCompact ? 'mb-1' : 'mb-2'}`}
        >
          {title}
        </h3>
        {subtitle ? (
          <p className={`flex items-center gap-2 ${isCompact ? 'text-[10px]' : 'text-[11px]'} text-gray-500 ${isCompact ? 'mb-1' : 'mb-2'}`}>
            <span className="inline-block size-1 shrink-0 rounded-full bg-gray-300" aria-hidden />
            <span className="line-clamp-2">{subtitle}</span>
          </p>
        ) : null}
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




