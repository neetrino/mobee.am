'use client';

import { useEffect, useRef, useState } from 'react';
import {
  CURRENCIES,
  getStoredCurrency,
  setStoredCurrency,
  type CurrencyCode,
} from '../lib/currency';

const ChevronDownIcon = () => (
  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * Compact currency control for footer (desktop) when header matches Figma without currency in the bar.
 */
export function FooterCurrency() {
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('AMD');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sync = () => setSelectedCurrency(getStoredCurrency());
    sync();
    window.addEventListener('currency-updated', sync);
    return () => window.removeEventListener('currency-updated', sync);
  }, []);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const selected = CURRENCIES[selectedCurrency];

  const handleChange = (code: CurrencyCode) => {
    setStoredCurrency(code);
    setSelectedCurrency(code);
    setOpen(false);
    window.dispatchEvent(new Event('currency-updated'));
  };

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-md border border-gray-600 bg-transparent px-3 py-1.5 text-sm text-gray-300 transition-colors hover:border-gray-400 hover:text-white"
        aria-expanded={open}
      >
        <span className="font-semibold">{selected.symbol}</span>
        <span>{selectedCurrency}</span>
        <ChevronDownIcon />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-40 overflow-hidden rounded-md border border-gray-600 bg-gray-900 shadow-xl">
          {Object.values(CURRENCIES).map((currency) => (
            <button
              key={currency.code}
              type="button"
              onClick={() => handleChange(currency.code)}
              className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                selectedCurrency === currency.code
                  ? 'bg-gray-800 font-semibold text-white'
                  : 'text-gray-200 hover:bg-gray-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{currency.code}</span>
                <span className="text-gray-400">{currency.symbol}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
