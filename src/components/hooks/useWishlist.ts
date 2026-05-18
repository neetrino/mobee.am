'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../lib/auth/AuthContext';
import { getLoginUrlWithRedirect } from '../../lib/auth/loginRedirectUrl';
import { queueWishlistProductForAfterLogin } from '../../lib/wishlist/pendingWishlistAfterLogin';
import {
  isProductInWishlist,
  toggleWishlistProductId,
} from '../../lib/wishlist/wishlist-storage';

/**
 * Hook for managing wishlist state for a product
 * @param productId - The product ID to check/manage
 * @returns Object with wishlist state and toggle function
 */
export function useWishlist(productId: string) {
  const [isInWishlist, setIsInWishlist] = useState(false);
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkWishlist = () => {
      if (typeof window === 'undefined') return;
      setIsInWishlist(isProductInWishlist(productId));
    };

    checkWishlist();

    const handleWishlistUpdate = () => checkWishlist();
    window.addEventListener('wishlist-updated', handleWishlistUpdate);

    return () => {
      window.removeEventListener('wishlist-updated', handleWishlistUpdate);
    };
  }, [productId]);

  const toggleWishlist = () => {
    if (typeof window === 'undefined') return;

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
    } catch (error) {
      console.error('Error updating wishlist:', error);
    }
  };

  return { isInWishlist, toggleWishlist };
}
