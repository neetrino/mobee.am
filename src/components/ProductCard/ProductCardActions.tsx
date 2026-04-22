'use client';

import type { MouseEvent } from 'react';
import { CompareIcon } from '../icons/CompareIcon';
import { CartIcon as CartPngIcon } from '../icons/CartIcon';
import { WishlistHeartIcon } from '../icons/WishlistHeartIcon';
import { useTranslation } from '../../lib/i18n-client';

interface ProductCardActionsProps {
  isInWishlist: boolean;
  isInCompare: boolean;
  isAddingToCart: boolean;
  inStock: boolean;
  isCompact?: boolean;
  onWishlistToggle: (e: MouseEvent) => void;
  onCompareToggle: (e: MouseEvent) => void;
  onAddToCart: (e: MouseEvent) => void;
  /** Stack wishlist + compare at the top-right of the product image (always visible; not hover-only). */
  cornerOnImage?: boolean;
}

/**
 * Component for product action buttons (wishlist, compare, cart)
 */
export function ProductCardActions({
  isInWishlist,
  isInCompare,
  isAddingToCart,
  inStock,
  isCompact = false,
  onWishlistToggle,
  onCompareToggle,
  onAddToCart,
  cornerOnImage = false,
}: ProductCardActionsProps) {
  const { t } = useTranslation();
  const iconSize = isCompact ? 18 : 24;
  const buttonSize = isCompact ? 'w-10 h-10' : 'w-12 h-12';
  /** Figma mobee-new: 42px controls, ~11px from top, heart above compare */
  const gridCornerSize = isCompact ? 'h-10 w-10 min-h-10 min-w-10' : 'h-[42px] w-[42px] min-h-[42px] min-w-[42px]';
  const gridCornerIconWishlist = isCompact ? 18 : 20;
  const gridCornerIconCompare = isCompact ? 16 : 18;

  const actions = (
    <>
      {/* Compare Icon */}
      <button
        onClick={onCompareToggle}
        className={`${buttonSize} rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
          isInCompare
            ? 'border-gray-900 text-gray-900 bg-white shadow-sm'
            : 'border-gray-200 text-gray-700 bg-white hover:border-gray-300 hover:bg-gray-50'
        }`}
        title={isInCompare ? t('common.messages.removedFromCompare') : t('common.messages.addedToCompare')}
        aria-label={isInCompare ? t('common.ariaLabels.removeFromCompare') : t('common.ariaLabels.addToCompare')}
      >
        <CompareIcon isActive={isInCompare} size={isCompact ? 16 : 18} />
      </button>

      {/* Wishlist Icon */}
      <button
        onClick={onWishlistToggle}
        className={`${buttonSize} rounded-full flex items-center justify-center transition-all duration-200 ${
          isInWishlist
            ? 'bg-red-600 text-white shadow-lg'
            : 'bg-white text-gray-700 hover:bg-gray-50 shadow-md hover:shadow-lg'
        }`}
        title={isInWishlist ? t('common.messages.removedFromWishlist') : t('common.messages.addedToWishlist')}
        aria-label={isInWishlist ? t('common.ariaLabels.removeFromWishlist') : t('common.ariaLabels.addToWishlist')}
      >
        {isCompact ? (
          <WishlistHeartIcon filled={isInWishlist} size={18} />
        ) : (
          <WishlistHeartIcon filled={isInWishlist} />
        )}
      </button>
    </>
  );

  if (cornerOnImage) {
    return (
      <div
        className={`pointer-events-auto absolute z-[40] flex flex-col opacity-100 ${
          isCompact ? 'top-[11px] right-4 gap-1.5' : 'top-[12px] right-[18px] gap-[7px]'
        }`}
      >
        {/* Figma mobee-new 53:684 — heart above compare, ~11px from top, light blue circles */}
        <button
          type="button"
          onClick={onWishlistToggle}
          className={`${gridCornerSize} flex shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
            isInWishlist
              ? 'bg-red-600 text-white shadow-md'
              : 'bg-[#e8f0f8] text-gray-900 shadow-sm hover:bg-[#dbe8f5]'
          }`}
          title={isInWishlist ? t('common.messages.removedFromWishlist') : t('common.messages.addedToWishlist')}
          aria-label={isInWishlist ? t('common.ariaLabels.removeFromWishlist') : t('common.ariaLabels.addToWishlist')}
        >
          <WishlistHeartIcon filled={isInWishlist} size={gridCornerIconWishlist} />
        </button>
        <button
          type="button"
          onClick={onCompareToggle}
          className={`${gridCornerSize} flex shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 ${
            isInCompare
              ? 'border-gray-900 bg-white text-gray-900 shadow-sm'
              : 'border-transparent bg-[#e8f0f8] text-gray-900 shadow-sm hover:bg-[#dbe8f5]'
          }`}
          title={isInCompare ? t('common.messages.removedFromCompare') : t('common.messages.addedToCompare')}
          aria-label={isInCompare ? t('common.ariaLabels.removeFromCompare') : t('common.ariaLabels.addToCompare')}
        >
          <CompareIcon isActive={isInCompare} size={gridCornerIconCompare} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {actions}
      {/* Cart Icon */}
      <button
        onClick={onAddToCart}
        disabled={!inStock || isAddingToCart}
        className={`${buttonSize} rounded-full flex items-center justify-center transition-all duration-200 ${
          inStock && !isAddingToCart
            ? 'bg-transparent text-gray-600 hover:bg-green-600 hover:text-white hover:shadow-md'
            : 'bg-transparent text-gray-400 cursor-not-allowed'
        }`}
        title={inStock ? t('common.buttons.addToCart') : t('common.stock.outOfStock')}
        aria-label={inStock ? t('common.ariaLabels.addToCart') : t('common.ariaLabels.outOfStock')}
      >
        {isAddingToCart ? (
          <svg className={`animate-spin ${isCompact ? 'h-5 w-5' : 'h-6 w-6'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : (
          <CartPngIcon size={iconSize} />
        )}
      </button>
    </div>
  );
}




