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
  discountPercent?: number | null;
  currency: CurrencyCode;
  colors?: Array<{ value: string; imageUrl?: string | null; colors?: string[] | null }>;
  isCompact?: boolean;
  /** Figma mobee-new: price lives in the bordered footer row with the add button */
  hidePrice?: boolean;
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
  discountPercent,
  currency,
  colors,
  isCompact = false,
  hidePrice = false,
}: ProductCardInfoProps) {
  const { t } = useTranslation();

  const paddingClass = (() => {
    if (hidePrice) {
      return isCompact ? 'px-3 pt-2 pb-2' : 'px-5 pt-0 pb-4';
    }
    return isCompact ? 'p-2.5' : 'p-4';
  })();

  return (
    <div className={paddingClass}>
      <Link href={`/products/${slug}`} className="block">
        {/* Product line (Figma: small caps category) */}
        <p
          className={`${isCompact ? 'text-[9px]' : 'text-[10px]'} font-bold uppercase tracking-[0.08em] text-gray-400 ${isCompact ? 'mb-0.5' : 'mb-1'}`}
        >
          {brandName || t('common.defaults.category')}
        </p>
        <h3
          className={`${isCompact ? 'text-base' : 'text-[18px] leading-7'} font-bold text-gray-900 line-clamp-2 ${subtitle ? (isCompact ? 'mb-0.5' : 'mb-1') : isCompact ? 'mb-1' : 'mb-2'}`}
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

      {!hidePrice ? (
        <div className={`mt-2 flex items-center justify-between ${isCompact ? 'gap-2' : 'gap-4'}`}>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span
                className={`whitespace-nowrap ${
                  isCompact ? 'text-[1.06875rem]' : 'text-[1.425rem]'
                } font-semibold text-gray-900`}
              >
                {formatPrice(price || 0, currency)}
              </span>
              {discountPercent && discountPercent > 0 ? (
                <span
                  className={`${
                    isCompact ? 'text-[0.7125rem]' : 'text-[0.83125rem]'
                  } font-semibold text-blue-600`}
                >
                  -{discountPercent}%
                </span>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}




