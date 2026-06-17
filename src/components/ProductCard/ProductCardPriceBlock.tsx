'use client';

import { formatPrice, type CurrencyCode } from '../../lib/currency';

interface ProductCardPriceBlockProps {
  price: number;
  currency: CurrencyCode;
  discountPercent?: number | null;
  listPrice?: number | null;
  priceClass: string;
  discountClass: string;
  homeProductGridCard?: boolean;
  showStrike?: boolean;
  /** Home mobile grid — keep strike row height for aligned card footers. */
  reserveMobileStrikeRow?: boolean;
  className?: string;
}

export function ProductCardPriceBlock({
  price,
  currency,
  discountPercent,
  listPrice,
  priceClass,
  discountClass,
  homeProductGridCard = false,
  showStrike = false,
  reserveMobileStrikeRow = false,
  className = '',
}: ProductCardPriceBlockProps) {
  return (
    <div className={`min-w-0 flex flex-col gap-0.5 ${className}`}>
      <div className="flex min-w-0 flex-wrap items-center gap-1">
        <span
          className={`font-bold tabular-nums text-gray-900 ${
            homeProductGridCard
              ? 'whitespace-nowrap max-lg:whitespace-normal max-lg:break-words'
              : 'min-w-0 truncate'
          } ${priceClass}`}
        >
          {formatPrice(price || 0, currency)}
        </span>
        {discountPercent && discountPercent > 0 ? (
          <span
            className={`font-semibold text-blue-600 ${
              homeProductGridCard ? 'max-lg:hidden' : ''
            } ${discountClass}`}
          >
            -{discountPercent}%
          </span>
        ) : null}
      </div>
      {homeProductGridCard ? (
        <div className="flex min-h-[14px] items-center max-lg:flex lg:hidden" aria-hidden={!showStrike && !reserveMobileStrikeRow}>
          {showStrike && listPrice != null ? (
            <span className="text-[10px] font-normal italic leading-tight text-[#8e8e93] line-through">
              {formatPrice(listPrice, currency)}
            </span>
          ) : reserveMobileStrikeRow ? (
            <span className="invisible text-[10px] leading-tight" aria-hidden>
              &nbsp;
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
