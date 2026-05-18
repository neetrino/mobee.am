'use client';

import type { MouseEvent } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { toggleCompareProduct } from '../../../../lib/shop/compare-storage';
import { toggleWishlistProductId } from '../../../../lib/wishlist/wishlist-storage';
import { useAuth } from '../../../../lib/auth/AuthContext';
import { getLoginUrlWithRedirect } from '../../../../lib/auth/loginRedirectUrl';
import { queueWishlistProductForAfterLogin } from '../../../../lib/wishlist/pendingWishlistAfterLogin';

interface UseProductActionsProps {
  productId: string | null;
  compareCategoryId: string;
  isInWishlist: boolean;
  setIsInWishlist: (value: boolean) => void;
  setIsInCompare: (value: boolean) => void;
}

export function useProductActions({
  productId,
  compareCategoryId,
  isInWishlist,
  setIsInWishlist,
  setIsInCompare,
}: UseProductActionsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoggedIn, isLoading: authLoading } = useAuth();

  const handleAddToWishlist = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!productId || typeof window === 'undefined') return;

    if (authLoading && !isInWishlist) {
      return;
    }
    if (!isLoggedIn && !isInWishlist) {
      queueWishlistProductForAfterLogin(productId);
      router.push(getLoginUrlWithRedirect(pathname || '/'));
      return;
    }

    try {
      const added = toggleWishlistProductId(productId);
      setIsInWishlist(added);
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
        return;
      }
      if (outcome === 'removed') {
        setIsInCompare(false);
      } else {
        setIsInCompare(true);
      }

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




