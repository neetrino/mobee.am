'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '../lib/api-client';
import { getStoredLanguage } from '../lib/language';
import { getStoredCurrency, formatPrice as formatCurrencyPrice, type CurrencyCode } from '../lib/currency';
import { useTranslation } from '../lib/i18n-client';
import { useProductsFilters } from './ProductsFiltersProvider';

interface PriceFilterProps {
  currentMinPrice?: string;
  currentMaxPrice?: string;
  category?: string;
  search?: string;
}

interface PriceRange {
  min: number;
  max: number;
  stepSize?: number | null;
  stepSizePerCurrency?: Partial<Record<CurrencyCode, number>> | null;
}

export function PriceFilter({ currentMinPrice, currentMaxPrice, category }: PriceFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filtersContext = useProductsFilters();
  const { t } = useTranslation();
  const [priceRange, setPriceRange] = useState<PriceRange>({
    min: 0,
    max: 100000,
    stepSize: null,
    stepSizePerCurrency: null,
  });
  const [minPrice, setMinPrice] = useState(currentMinPrice ? parseFloat(currentMinPrice) : 0);
  const [maxPrice, setMaxPrice] = useState(currentMaxPrice ? parseFloat(currentMaxPrice) : 100000);
  const [isDragging, setIsDragging] = useState<'min' | 'max' | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode>('USD'); // Default для SSR
  const sliderRef = useRef<HTMLDivElement>(null);

  // Helper function to round value to step size
  const roundToStep = (value: number, step: number | null | undefined): number => {
    if (!step || step <= 0) return Math.round(value);
    return Math.round(value / step) * step;
  };

  // Загружаем валюту только на клиенте, чтобы избежать проблем с гидратацией
  useEffect(() => {
    const updateCurrency = () => {
      setCurrency(getStoredCurrency());
    };
    
    // Загружаем валюту при монтировании
    updateCurrency();
    
    // Слушаем изменения валюты
    if (typeof window !== 'undefined') {
      window.addEventListener('currency-updated', updateCurrency);
      return () => {
        window.removeEventListener('currency-updated', updateCurrency);
      };
    }
  }, []);

  useEffect(() => {
    if (filtersContext?.data?.priceRange) {
      const pr = filtersContext.data.priceRange;
      setPriceRange(pr as PriceRange);
      if (!currentMinPrice) setMinPrice(pr.min);
      if (!currentMaxPrice) setMaxPrice(pr.max);
      return;
    }
    if (filtersContext === null) {
      fetchPriceRange();
    }
  }, [category, filtersContext?.data?.priceRange, filtersContext === null]);

  useEffect(() => {
    if (currentMinPrice) {
      setMinPrice(parseFloat(currentMinPrice));
    } else {
      setMinPrice(priceRange.min);
    }
    if (currentMaxPrice) {
      setMaxPrice(parseFloat(currentMaxPrice));
    } else {
      setMaxPrice(priceRange.max);
    }
  }, [currentMinPrice, currentMaxPrice, priceRange]);

  const fetchPriceRange = async () => {
    try {
      const language = getStoredLanguage();
      const params: Record<string, string> = { lang: language };
      if (category) params.category = category;

      const response = await apiClient.get<PriceRange>('/api/v1/products/price-range', { params });
      setPriceRange(response);
      if (!currentMinPrice) setMinPrice(response.min);
      if (!currentMaxPrice) setMaxPrice(response.max);
    } catch (error) {
      console.error('Error fetching price range:', error);
    }
  };

  const resolveStepSize = (): number => {
    const perCurrency = priceRange.stepSizePerCurrency || {};
    const currencyStep = perCurrency[currency];
    if (currencyStep && currencyStep > 0) {
      return currencyStep;
    }
    if (priceRange.stepSize && priceRange.stepSize > 0) {
      return priceRange.stepSize;
    }
    return 1;
  };

  const getPercentage = (value: number) => {
    return ((value - priceRange.min) / (priceRange.max - priceRange.min)) * 100;
  };

  const handleMouseDown = (type: 'min' | 'max') => {
    setIsDragging(type);
  };

  const updatePrice = (clientX: number) => {
    if (!sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const value = priceRange.min + (percentage / 100) * (priceRange.max - priceRange.min);
    const step = resolveStepSize();
    const roundedValue = roundToStep(value, step);

    if (isDragging === 'min') {
      const currentMax = typeof maxPrice === 'number' && !isNaN(maxPrice) ? maxPrice : priceRange.max;
      const newMin = Math.max(priceRange.min, Math.min(roundedValue, currentMax - step));
      setMinPrice(newMin);
    } else if (isDragging === 'max') {
      const currentMin = typeof minPrice === 'number' && !isNaN(minPrice) ? minPrice : priceRange.min;
      const newMax = Math.min(priceRange.max, Math.max(roundedValue, currentMin + step));
      setMaxPrice(newMax);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    updatePrice(e.clientX);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging || e.touches.length === 0) return;
    updatePrice(e.touches[0].clientX);
  };

  const handleMouseUp = () => {
    setIsDragging(null);
  };

  const handleTouchEnd = () => {
    setIsDragging(null);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, minPrice, maxPrice, priceRange]);

  // Auto-apply filter when dragging ends
  useEffect(() => {
    if (!isDragging) {
      // Only apply if values have changed from initial/default
      const shouldApplyMin = minPrice !== priceRange.min;
      const shouldApplyMax = maxPrice !== priceRange.max;
      
      if (shouldApplyMin || shouldApplyMax) {
        // Ստեղծում ենք նոր URLSearchParams URL-ի հիման վրա, որպեսզի պահպանենք բոլոր params-ները
        const params = new URLSearchParams(searchParams.toString());
        
        if (shouldApplyMin) {
          params.set('minPrice', minPrice.toString());
        } else {
          params.delete('minPrice');
        }
        
        if (shouldApplyMax) {
          params.set('maxPrice', maxPrice.toString());
        } else {
          params.delete('maxPrice');
        }
        
        // Reset page to 1 when filters change
        params.delete('page');
        
        const nextQueryString = params.toString();
        const currentQueryString = searchParams.toString();

        // Avoid navigation loop when query already matches current URL.
        if (nextQueryString === currentQueryString) {
          return;
        }

        // Use a small delay to debounce rapid changes
        const timeoutId = setTimeout(() => {
          const nextUrl = nextQueryString ? `${pathname}?${nextQueryString}` : pathname;
          router.replace(nextUrl, { scroll: false });
        }, 300);
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [isDragging, minPrice, maxPrice, priceRange, pathname, searchParams, router]);

  // Используем функцию форматирования из currency.ts для консистентности
  const formatPrice = (price: number) => {
    if (typeof price !== 'number' || isNaN(price) || !isFinite(price)) {
      return formatCurrencyPrice(0, currency);
    }
    return formatCurrencyPrice(price, currency);
  };

  const safeMinPrice: number = typeof minPrice === 'number' && !isNaN(minPrice) && isFinite(minPrice) ? minPrice : 0;
  const safeMaxPrice: number = typeof maxPrice === 'number' && !isNaN(maxPrice) && isFinite(maxPrice) ? maxPrice : 100000;
  
  const minPercentage = getPercentage(safeMinPrice);
  const maxPercentage = getPercentage(safeMaxPrice);

  return (
    <section className="border-b border-[#E2E8F0] pb-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold leading-6 tracking-[-0.02em] text-[#314158]">
          {t('products.filters.price.sectionTitle')}
        </h3>
        <p className="text-base font-bold leading-6 tracking-[-0.02em] text-black">
          {formatPrice(Number(safeMinPrice) || 0)} - {formatPrice(Number(safeMaxPrice) || 100000)}
        </p>
      </div>

      <div className="mt-4">
        <div
          ref={sliderRef}
          className="relative h-2 cursor-pointer rounded-full bg-[#E2E8F0]"
          onMouseDown={(e) => {
            const rect = sliderRef.current?.getBoundingClientRect();
            if (!rect) return;
            const percentage = ((e.clientX - rect.left) / rect.width) * 100;
    const value = priceRange.min + (percentage / 100) * (priceRange.max - priceRange.min);
    const step = resolveStepSize();
            const roundedValue = roundToStep(value, step);
            
            const currentMin = typeof minPrice === 'number' && !isNaN(minPrice) ? minPrice : priceRange.min;
            const currentMax = typeof maxPrice === 'number' && !isNaN(maxPrice) ? maxPrice : priceRange.max;
            
            if (Math.abs(roundedValue - currentMin) < Math.abs(roundedValue - currentMax)) {
              const newMin = Math.max(priceRange.min, Math.min(roundedValue, currentMax - step));
              setMinPrice(newMin);
              handleMouseDown('min');
            } else {
              const newMax = Math.min(priceRange.max, Math.max(roundedValue, currentMin + step));
              setMaxPrice(newMax);
              handleMouseDown('max');
            }
          }}
        >
          <div
            className="absolute h-2 rounded-full bg-[#3BA3E3]"
            style={{
              left: `${minPercentage}%`,
              width: `${maxPercentage - minPercentage}%`,
            }}
          />

          <div
            className="absolute cursor-grab active:cursor-grabbing z-10"
            style={{ left: `${minPercentage}%`, top: '50%', transform: 'translate(-50%, -50%)' }}
            onMouseDown={(e) => {
              e.stopPropagation();
              handleMouseDown('min');
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              handleMouseDown('min');
            }}
          >
            <div className="h-5 w-5 rounded-full border border-[#E2E8F0] bg-white shadow-sm transition-colors hover:border-[#2CA1E2] hover:shadow-md" />
          </div>

          <div
            className="absolute cursor-grab active:cursor-grabbing z-10"
            style={{ left: `${maxPercentage}%`, top: '50%', transform: 'translate(-50%, -50%)' }}
            onMouseDown={(e) => {
              e.stopPropagation();
              handleMouseDown('max');
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              handleMouseDown('max');
            }}
          >
            <div className="h-5 w-5 rounded-full border border-[#E2E8F0] bg-white shadow-sm transition-colors hover:border-[#2CA1E2] hover:shadow-md" />
          </div>
        </div>
      </div>

      <p className="mt-3 text-sm leading-5 tracking-[-0.01em] text-[#62748E]">
        {t('products.filters.price.priceLabel')}
      </p>
    </section>
  );
}
