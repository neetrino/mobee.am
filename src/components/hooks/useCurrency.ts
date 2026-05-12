'use client';

import { useState, useEffect, useLayoutEffect } from 'react';
import { getStoredCurrency, SSR_DEFAULT_DISPLAY_CURRENCY } from '../../lib/currency';

/**
 * Display currency aligned with SSR: first paint uses the same default as the server,
 * then syncs from `localStorage` in `useLayoutEffect` to avoid hydration mismatch.
 */
export function useCurrency() {
  const [currency, setCurrency] = useState(() => SSR_DEFAULT_DISPLAY_CURRENCY);

  useLayoutEffect(() => {
    setCurrency(getStoredCurrency());
  }, []);

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
