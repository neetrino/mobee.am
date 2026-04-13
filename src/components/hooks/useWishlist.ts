'use client';

import { useState, useEffect } from 'react';

const WISHLIST_KEY = 'shop_wishlist';

/**
 * Hook for managing wishlist state for a product
 * @param productId - The product ID to check/manage
 * @returns Object with wishlist state and toggle function
 */
export function useWishlist(productId: string) {
  const [isInWishlist, setIsInWishlist] = useState(false);

  useEffect(() => {
    const checkWishlist = () => {
      if (typeof window === 'undefined') return;
      try {
        const stored = localStorage.getItem(WISHLIST_KEY);
        const wishlist = stored ? JSON.parse(stored) : [];
        setIsInWishlist(wishlist.includes(productId));
      } catch {
        setIsInWishlist(false);
      }
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
    
    try {
      const stored = localStorage.getItem(WISHLIST_KEY);
      const wishlist: string[] = stored ? JSON.parse(stored) : [];
      
      if (isInWishlist) {
        const updated = wishlist.filter((id) => id !== productId);
        localStorage.setItem(WISHLIST_KEY, JSON.stringify(updated));
        setIsInWishlist(false);
      } else {
        wishlist.push(productId);
        localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
        setIsInWishlist(true);
      }
      
      window.dispatchEvent(new Event('wishlist-updated'));
    } catch (error) {
      console.error('Error updating wishlist:', error);
    }
  };

  return { isInWishlist, toggleWishlist };
}




