'use client';

import type { MouseEvent } from 'react';
import { CartIcon } from '../icons/CartIcon';
import { ProductCardQuickAddIcon } from '../icons/ProductCardQuickAddIcon';

interface ProductCardAddToCartButtonProps {
  layout: 'mobileRound' | 'desktopPill';
  inStock: boolean;
  isAddingToCart: boolean;
  isCompact?: boolean;
  title: string;
  ariaLabel: string;
  addToCartLabel: string;
  onAddToCart: (event: MouseEvent) => void;
}

export function ProductCardAddToCartButton({
  layout,
  inStock,
  isAddingToCart,
  isCompact = false,
  title,
  ariaLabel,
  addToCartLabel,
  onAddToCart,
}: ProductCardAddToCartButtonProps) {
  const isMobileRound = layout === 'mobileRound';

  return (
    <button
      type="button"
      onClick={onAddToCart}
      disabled={!inStock || isAddingToCart}
      className={`inline-flex shrink-0 items-center justify-center bg-[#2db2ff] font-medium text-white transition-opacity ${
        inStock && !isAddingToCart
          ? 'cursor-pointer hover:opacity-90'
          : 'cursor-default opacity-50'
      } ${
        isMobileRound
          ? 'size-9 min-h-9 min-w-9 rounded-full p-0'
          : isCompact
            ? 'h-10 min-w-[110px] gap-2 rounded-[20px] px-3 text-xs tracking-wide'
            : 'h-[38.88px] min-w-[106.92px] gap-[6.3px] rounded-[16.2px] px-[12.96px] text-[11.34px] leading-[21.6px] tracking-[0.162px]'
      }`}
      title={title}
      aria-label={ariaLabel}
    >
      {isAddingToCart ? (
        <svg
          className={`animate-spin ${isMobileRound || isCompact ? 'h-4 w-4' : 'h-[16.2px] w-[16.2px]'}`}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : isMobileRound ? (
        <ProductCardQuickAddIcon size={20} />
      ) : (
        <>
          <CartIcon className="shrink-0" size={isCompact ? 18 : 16.2} />
          <span className="whitespace-nowrap">{addToCartLabel}</span>
        </>
      )}
    </button>
  );
}
