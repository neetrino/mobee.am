import type { MouseEvent } from 'react';
import { WISHLIST_KEY } from '../types';
import { t } from '../../../../lib/i18n';
import type { LanguageCode } from '../../../../lib/language';
import { toggleCompareProduct } from '../../../../lib/shop/compare-storage';

interface UseProductActionsProps {
  productId: string | null;
  compareCategoryId: string;
  isInWishlist: boolean;
  setIsInWishlist: (value: boolean) => void;
  setIsInCompare: (value: boolean) => void;
  setShowMessage: (message: string | null) => void;
  language: LanguageCode;
}

export function useProductActions({
  productId,
  compareCategoryId,
  isInWishlist,
  setIsInWishlist,
  setIsInCompare,
  setShowMessage,
  language,
}: UseProductActionsProps) {
  const handleAddToWishlist = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!productId || typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(WISHLIST_KEY);
      const wishlist: string[] = stored ? JSON.parse(stored) : [];
      
      if (isInWishlist) {
        localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist.filter(id => id !== productId)));
        setIsInWishlist(false);
        setShowMessage(t(language, 'product.removedFromWishlist'));
      } else {
        wishlist.push(productId);
        localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
        setIsInWishlist(true);
        setShowMessage(t(language, 'product.addedToWishlist'));
      }
      
      setTimeout(() => setShowMessage(null), 2000);
      window.dispatchEvent(new Event('wishlist-updated'));
    } catch {
      // Silently fail
    }
  };

  const handleCompareToggle = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!productId || typeof window === 'undefined') return;

    try {
      const { outcome } = toggleCompareProduct(productId, compareCategoryId);
      if (outcome === 'group_full') {
        setShowMessage(t(language, 'product.compareListFull'));
      } else if (outcome === 'removed') {
        setIsInCompare(false);
        setShowMessage(t(language, 'product.removedFromCompare'));
      } else {
        setIsInCompare(true);
        setShowMessage(t(language, 'product.addedToCompare'));
      }

      setTimeout(() => setShowMessage(null), 2000);
      window.dispatchEvent(new Event('compare-updated'));
    } catch {
      // Silently fail
    }
  };

  return {
    handleAddToWishlist,
    handleCompareToggle,
  };
}




