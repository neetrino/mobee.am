'use client';

import { formatPrice, type CurrencyCode } from '../../lib/currency';

interface ProductCardPriceBlockProps {
  price: number | null;
  hasPrice?: boolean;
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
  hasPrice = price != null && price > 0,
  currency,
  discountPercent,
  listPrice,
  priceClass,
  discountClass,
  homeProductGridCard = false,
  showStrike = false,
}: ProductCardPriceBlockProps) {
  if (!hasPrice || price == null) {
    return <div className="min-h-[1.25rem] min-w-0" aria-hidden="true" />;
  }

  return (
    <div
      className={`min-w-0 flex flex-col gap-0.5 ${
        homeProductGridCard ? 'max-lg:min-h-[2.125rem] max-lg:justify-end' : ''
      }`}
    >
      {homeProductGridCard && showStrike && listPrice != null ? (
        <span className="hidden text-[10px] font-normal italic leading-tight text-[#8e8e93] line-through max-lg:block">
          {formatPrice(listPrice, currency)}
        </span>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <span className={`whitespace-nowrap font-bold tabular-nums text-gray-900 ${priceClass}`}>
          {formatPrice(price, currency)}
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
    </div>
  );
}
