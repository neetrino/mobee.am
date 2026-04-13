'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '../../lib/i18n-client';

const COMPARE_KEY = 'shop_compare';
const MAX_COMPARE_ITEMS = 4;

/**
 * Hook for managing compare state for a product
 * @param productId - The product ID to check/manage
 * @returns Object with compare state and toggle function
 */
export function useCompare(productId: string) {
  const { t } = useTranslation();
  const [isInCompare, setIsInCompare] = useState(false);

  useEffect(() => {
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

    const handleCompareUpdate = () => checkCompare();
    window.addEventListener('compare-updated', handleCompareUpdate);

    return () => {
      window.removeEventListener('compare-updated', handleCompareUpdate);
    };
  }, [productId]);

  const toggleCompare = () => {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(COMPARE_KEY);
      const compare: string[] = stored ? JSON.parse(stored) : [];
      
      if (isInCompare) {
        const updated = compare.filter((id) => id !== productId);
        localStorage.setItem(COMPARE_KEY, JSON.stringify(updated));
        setIsInCompare(false);
      } else {
        if (compare.length >= MAX_COMPARE_ITEMS) {
          alert(t('common.alerts.compareMaxReached'));
          return;
        }
        compare.push(productId);
        localStorage.setItem(COMPARE_KEY, JSON.stringify(compare));
        setIsInCompare(true);
      }
      
      window.dispatchEvent(new Event('compare-updated'));
    } catch (error) {
      console.error('Error updating compare:', error);
    }
  };

  return { isInCompare, toggleCompare };
}




