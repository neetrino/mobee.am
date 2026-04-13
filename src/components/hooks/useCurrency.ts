'use client';

import { useState, useEffect } from 'react';
import { getStoredCurrency } from '../../lib/currency';

/**
 * Hook for managing currency state
 * @returns Current currency code
 */
export function useCurrency() {
  const [currency, setCurrency] = useState(getStoredCurrency());

  useEffect(() => {
    const handleCurrencyUpdate = () => {
      setCurrency(getStoredCurrency());
    };
    
    const handleCurrencyRatesUpdate = () => {
      setCurrency(getStoredCurrency());
    };

    window.addEventListener('currency-updated', handleCurrencyUpdate);
    window.addEventListener('currency-rates-updated', handleCurrencyRatesUpdate);
    
    return () => {
      window.removeEventListener('currency-updated', handleCurrencyUpdate);
      window.removeEventListener('currency-rates-updated', handleCurrencyRatesUpdate);
    };
  }, []);

  return currency;
}




