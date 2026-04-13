import { useState, useEffect } from 'react';
import { WISHLIST_KEY, COMPARE_KEY } from '../types';

interface UseWishlistCompareProps {
  productId: string | null;
}

export function useWishlistCompare({ productId }: UseWishlistCompareProps) {
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isInCompare, setIsInCompare] = useState(false);

  useEffect(() => {
    if (!productId) return;
    
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
    window.addEventListener('wishlist-updated', checkWishlist);
    return () => window.removeEventListener('wishlist-updated', checkWishlist);
  }, [productId]);

  useEffect(() => {
    if (!productId) return;
    
    const checkCompare = () => {
      if (typeof window === 'undefined') return;
      try {
        const stored = localStorage.getItem(COMPARE_KEY);
        const compare = stored ? JSON.parse(stored) : [];
        setIsInCompare(compare.includes(productId));
      } catch {
        setIsInCompare(false);
      }
    };
    
    checkCompare();
    window.addEventListener('compare-updated', checkCompare);
    return () => window.removeEventListener('compare-updated', checkCompare);
  }, [productId]);

  return { isInWishlist, setIsInWishlist, isInCompare, setIsInCompare };
}




