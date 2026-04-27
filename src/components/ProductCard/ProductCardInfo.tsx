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
  /** Home mobile grid — hide small caps brand row. */
  omitBrandRow?: boolean;
  /** Home mobile grid — title at 12px regular on small screens. */
  titleSizeMobileFigma?: boolean;
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
  omitBrandRow = false,
  titleSizeMobileFigma = false,
}: ProductCardInfoProps) {
  const { t } = useTranslation();

  const paddingClass = (() => {
    if (hidePrice) {
      if (omitBrandRow) {
        return 'px-3 pb-2 pt-2 lg:px-5 lg:pb-4 lg:pt-0';
      }
      return isCompact ? 'px-3 pt-2 pb-2' : 'px-5 pt-0 pb-4';
    }
    return isCompact ? 'p-2.5' : 'p-4';
  })();

  const titleClass = (() => {
    if (titleSizeMobileFigma) {
      return `line-clamp-2 text-gray-900 max-lg:text-xs max-lg:font-normal max-lg:leading-normal lg:text-[18px] lg:font-bold lg:leading-7 ${
        subtitle ? 'mb-0.5 lg:mb-1' : 'mb-1 lg:mb-2'
      }`;
    }
    if (isCompact) {
      return `text-base font-bold text-gray-900 line-clamp-2 ${subtitle ? 'mb-0.5' : 'mb-1'}`;
    }
    return `text-[18px] leading-7 font-bold text-gray-900 line-clamp-2 ${subtitle ? 'mb-1' : 'mb-2'}`;
  })();

  return (
    <div className={paddingClass}>
      <Link href={`/products/${slug}`} className="block">
        {!omitBrandRow ? (
          <p
            className={`${isCompact ? 'mb-0.5 text-[9px]' : 'mb-1 text-[10px]'} font-bold uppercase tracking-[0.08em] text-gray-400`}
          >
            {brandName || t('common.defaults.category')}
          </p>
        ) : null}
        <h3 className={titleClass}>{title}</h3>
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




