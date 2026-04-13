import { useState, useEffect } from 'react';
import { getStoredCurrency, type CurrencyCode } from '../../../lib/currency';

export function useCurrency() {
  const [currency, setCurrency] = useState<CurrencyCode>(() => getStoredCurrency());

  // Initialize currency and listen for currency changes
  useEffect(() => {
    const updateCurrency = () => {
      const newCurrency = getStoredCurrency();
      console.log('💱 [PROFILE] Currency updated to:', newCurrency);
      setCurrency(newCurrency);
    };
    
    updateCurrency();
    
    if (typeof window !== 'undefined') {
      window.addEventListener('currency-updated', updateCurrency);
      const handleCurrencyRatesUpdate = () => {
        console.log('💱 [PROFILE] Currency rates updated, refreshing currency...');
        updateCurrency();
      };
      window.addEventListener('currency-rates-updated', handleCurrencyRatesUpdate);
      
      return () => {
        window.removeEventListener('currency-updated', updateCurrency);
        window.removeEventListener('currency-rates-updated', handleCurrencyRatesUpdate);
      };
    }
  }, []);

  return {
    currency,
  };
}




