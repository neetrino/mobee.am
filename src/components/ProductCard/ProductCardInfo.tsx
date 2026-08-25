'use client';

import Link from 'next/link';
import { formatPrice } from '../../lib/currency';
import { useTranslation } from '../../lib/i18n-client';
import { ProductColors } from './ProductColors';
import { ProductCardNavLink } from './ProductCardNavLink';
import { buildProductPageHref } from '../../lib/products/product-page-href';
import type { ProductCardCachePayload } from '../../lib/products/product-card-cache';
import type { CurrencyCode } from '../../lib/currency';

interface ProductCardInfoProps {
  slug: string;
  title: string;
  /** Localized category line under the title (replaces product subtitle on cards). */
  categoryLine?: string | null;
  brandName?: string | null;
  price: number | null;
  hasPrice?: boolean;
  discountPercent?: number | null;
  currency: CurrencyCode;
  colors?: Array<{ value: string; linkValue?: string; imageUrl?: string | null; colors?: string[] | null }>;
  isCompact?: boolean;
  /** Figma mobee-new: price lives in the bordered footer row with the add button */
  hidePrice?: boolean;
  /** Grid card: color swatches sit under the product image. */
  hideColors?: boolean;
  /** Home mobile grid — hide small caps brand row. */
  omitBrandRow?: boolean;
  /** Home mobile grid — title at 12px regular on small screens. */
  titleSizeMobileFigma?: boolean;
  listingCacheSource?: ProductCardCachePayload;
  linkColor?: string | null;
  selectedCardLinkColor?: string | null;
  colorsInteractive?: boolean;
  onCardColorSelect?: (color: { value: string; linkValue?: string; imageUrl?: string | null; colors?: string[] | null }) => void;
}

/**
 * Component for displaying product information (title, brand, price, colors)
 */
export function ProductCardInfo({
  slug,
  title,
  categoryLine,
  brandName,
  price,
  hasPrice = price != null && price > 0,
  discountPercent,
  currency,
  colors,
  isCompact = false,
  hidePrice = false,
  hideColors = false,
  omitBrandRow = false,
  titleSizeMobileFigma = false,
  listingCacheSource,
  linkColor = null,
  selectedCardLinkColor = null,
  colorsInteractive = false,
  onCardColorSelect,
}: ProductCardInfoProps) {
  const { t } = useTranslation();

  const paddingClass = (() => {
    if (hidePrice) {
      if (omitBrandRow) {
        return 'px-3 pb-2 pt-2 max-lg:pt-4 lg:px-5 lg:pb-4 lg:pt-0';
      }
      /** Figma 91:1313 — left 12 / right 18, gap 4 between brand and title. */
      return isCompact
        ? 'px-3 pb-4 pt-1'
        : 'pl-3 pr-[18px] pb-4 pt-1';
    }
    return isCompact ? 'p-2.5' : 'p-4';
  })();

  const titleClass = (() => {
    if (titleSizeMobileFigma) {
      return 'line-clamp-2 text-[#111827] max-lg:text-xs max-lg:font-normal max-lg:leading-normal lg:text-[18px] lg:font-bold lg:leading-7';
    }
    if (isCompact) {
      return 'line-clamp-2 text-base font-bold text-[#111827]';
    }
    return 'line-clamp-2 text-[18px] font-bold leading-7 text-[#111827]';
  })();
  const priceClass = isCompact ? 'text-[1.06875rem]' : 'text-[1.425rem]';

  const brandClass = isCompact
    ? 'mb-0 text-[9px] font-bold uppercase tracking-[1px] text-[#9ca3af]'
    : 'mb-0 text-[10px] font-bold uppercase tracking-[1px] text-[#9ca3af] leading-[15px]';

  const categoryClass = isCompact
    ? 'mt-1 flex items-center gap-2 text-[10px] text-[#6b7280]'
    : 'mt-1 flex items-center gap-2 text-[11px] leading-[16.5px] text-[#6b7280]';

  return (
    <div className={paddingClass}>
      {listingCacheSource ? (
        <ProductCardNavLink slug={slug} cachePayload={listingCacheSource} linkColor={linkColor} className="block">
          <div className="flex flex-col gap-1">
            {!omitBrandRow ? (
              <p className={brandClass}>
                {brandName || t('common.defaults.category')}
              </p>
            ) : null}
            <h3 className={titleClass}>{title}</h3>
            {categoryLine ? (
              <p className={categoryClass}>
                <span className="inline-block size-1 shrink-0 rounded-full bg-[#d1d5db]" aria-hidden />
                <span className="line-clamp-2">{categoryLine}</span>
              </p>
            ) : null}
          </div>
        </ProductCardNavLink>
      ) : (
        <Link href={buildProductPageHref(slug, { color: linkColor })} className="block" prefetch>
          <div className="flex flex-col gap-1">
            {!omitBrandRow ? (
              <p className={brandClass}>
                {brandName || t('common.defaults.category')}
              </p>
            ) : null}
            <h3 className={titleClass}>{title}</h3>
            {categoryLine ? (
              <p className={categoryClass}>
                <span className="inline-block size-1 shrink-0 rounded-full bg-[#d1d5db]" aria-hidden />
                <span className="line-clamp-2">{categoryLine}</span>
              </p>
            ) : null}
          </div>
        </Link>
      )}

      {!hideColors && colors && colors.length > 0 ? (
        <ProductColors
          colors={colors}
          isCompact={isCompact}
          interactive={colorsInteractive}
          selectedLinkValue={selectedCardLinkColor ?? linkColor}
          onColorSelect={onCardColorSelect}
        />
      ) : null}

      {!hidePrice ? (
        <div className={`mt-2 flex items-center justify-between ${isCompact ? 'gap-2' : 'gap-4'}`}>
          {hasPrice && price != null ? (
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span
                  className={`whitespace-nowrap ${priceClass} font-semibold text-gray-900`}
                >
                  {formatPrice(price, currency)}
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
          ) : (
            <div className="min-h-[1.25rem]" aria-hidden="true" />
          )}
        </div>
      ) : null}
    </div>
  );
}




