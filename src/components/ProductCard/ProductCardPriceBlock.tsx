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
}: ProductCardPriceBlockProps) {
  return (
    <div className="min-w-0 flex flex-col gap-0.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`whitespace-nowrap font-bold tabular-nums text-gray-900 ${priceClass}`}>
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
        <div className="flex min-h-[14px] flex-col gap-[5px] max-lg:flex lg:hidden" aria-hidden={!showStrike}>
          {showStrike && listPrice != null ? (
            <span className="text-[10px] font-normal italic leading-tight text-[#8e8e93] line-through">
              {formatPrice(listPrice, currency)}
            </span>
          ) : (
            <span className="invisible block text-[10px] leading-tight">&nbsp;</span>
          )}
        </div>
      ) : null}
    </div>
  );
}
