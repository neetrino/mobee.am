'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '../../lib/i18n-client';
import { isProductIdInCompare, toggleCompareProduct } from '../../lib/shop/compare-storage';

/**
 * Hook for managing compare state for a product (grouped by category, max 4 per category).
 */
export function useCompare(productId: string, compareCategoryId: string) {
  const { t } = useTranslation();
  const [isInCompare, setIsInCompare] = useState(false);

  useEffect(() => {
    const checkCompare = () => {
      if (typeof window === 'undefined') return;
      try {
        setIsInCompare(isProductIdInCompare(productId));
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
  }, [productId, compareCategoryId]);

  const toggleCompare = () => {
    if (typeof window === 'undefined') return;

    try {
      const { outcome } = toggleCompareProduct(productId, compareCategoryId);
      if (outcome === 'group_full') {
        alert(t('common.alerts.compareMaxReached'));
        return;
      }
      setIsInCompare(isProductIdInCompare(productId));
      window.dispatchEvent(new Event('compare-updated'));
    } catch (error) {
      console.error('Error updating compare:', error);
    }
  };

  return { isInCompare, toggleCompare };
}




