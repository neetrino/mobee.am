'use client';

import type { MouseEvent } from 'react';
import { CompareIcon } from '../icons/CompareIcon';
import { CartIcon as CartPngIcon } from '../icons/CartIcon';
import { useTranslation } from '../../lib/i18n-client';

interface WishlistIconProps {
  filled?: boolean;
  size?: number;
}

const WishlistIcon = ({ filled = false, size = 24 }: WishlistIconProps) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M10 17L8.55 15.7C4.4 12.2 2 10.1 2 7.5C2 5.4 3.4 4 5.5 4C6.8 4 8.1 4.6 9 5.5C9.9 4.6 11.2 4 12.5 4C14.6 4 16 5.4 16 7.5C16 10.1 13.6 12.2 9.45 15.7L10 17Z" 
      stroke="currentColor" 
      strokeWidth="1.8" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      fill={filled ? "currentColor" : "none"} 
    />
  </svg>
);

interface ProductCardActionsProps {
  isInWishlist: boolean;
  isInCompare: boolean;
  isAddingToCart: boolean;
  inStock: boolean;
  isCompact?: boolean;
  onWishlistToggle: (e: MouseEvent) => void;
  onCompareToggle: (e: MouseEvent) => void;
  onAddToCart: (e: MouseEvent) => void;
  showOnHover?: boolean;
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
  showOnHover = false,
}: ProductCardActionsProps) {
  const { t } = useTranslation();
  const iconSize = isCompact ? 18 : 24;
  const buttonSize = isCompact ? 'w-10 h-10' : 'w-12 h-12';

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
          <WishlistIcon filled={isInWishlist} size={18} />
        ) : (
          <WishlistIcon filled={isInWishlist} />
        )}
      </button>
    </>
  );

  if (showOnHover) {
    return (
      <div className={`absolute ${isCompact ? 'top-1.5 right-1.5' : 'top-3 right-3'} flex flex-col ${isCompact ? 'gap-1.5' : 'gap-2'} opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10`}>
        {actions}
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




