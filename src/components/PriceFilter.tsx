'use client';

import { useState, useEffect, useRef, useCallback, type PointerEvent } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '../lib/api-client';
import { getStoredLanguage } from '../lib/language';
import {
  getStoredCurrency,
  formatPrice as formatCurrencyPrice,
  initializeCurrencyRates,
  type CurrencyCode,
} from '../lib/currency';
import { useTranslation } from '../lib/i18n-client';
import { useProductsFilters } from './ProductsFiltersProvider';
import { warmShopNavigationFromSearchParams } from '@/lib/navigation/storefront-prefetch';
import {
  priceToSliderPercentage,
  resolvePriceFilterStepInBase,
  roundPriceToStep,
  syncPriceFilterValuesFromUrl,
} from '@/lib/shop/resolve-price-filter-step';

interface PriceFilterProps {
  currentMinPrice?: string;
  currentMaxPrice?: string;
  category?: string;
  search?: string;
}

interface PriceRange {
  min: number;
  max: number;
  hasProducts?: boolean;
  stepSize?: number | null;
  stepSizePerCurrency?: Partial<Record<CurrencyCode, number>> | null;
}

function readSliderValues(
  range: PriceRange,
  minFromUrl: string | undefined,
  maxFromUrl: string | undefined,
): { min: number; max: number } {
  return syncPriceFilterValuesFromUrl(
    range,
    minFromUrl ?? null,
    maxFromUrl ?? null,
  );
}

export function PriceFilter({
  currentMinPrice,
  currentMaxPrice,
  category,
  search,
}: PriceFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filtersContext = useProductsFilters();
  const { t } = useTranslation();
  const [priceRange, setPriceRange] = useState<PriceRange | null>(() =>
    filtersContext?.data?.priceRange
      ? (filtersContext.data.priceRange as PriceRange)
      : null,
  );
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<'min' | 'max' | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const minPriceRef = useRef(minPrice);
  const maxPriceRef = useRef(maxPrice);
  const priceRangeRef = useRef<PriceRange | null>(priceRange);

  const syncRefs = useCallback(
    (nextMin: number, nextMax: number, nextRange?: PriceRange) => {
      minPriceRef.current = nextMin;
      maxPriceRef.current = nextMax;
      setMinPrice(nextMin);
      setMaxPrice(nextMax);
      if (nextRange) {
        priceRangeRef.current = nextRange;
        setPriceRange(nextRange);
      }
    },
    [],
  );

  const resetDragState = useCallback(() => {
    isDraggingRef.current = null;
    if (activePointerIdRef.current !== null && sliderRef.current) {
      try {
        sliderRef.current.releasePointerCapture(activePointerIdRef.current);
      } catch {
        // pointer already released
      }
      activePointerIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    void initializeCurrencyRates();

    const syncCurrency = () => {
      resetDragState();
      setCurrency(getStoredCurrency());
      const range = priceRangeRef.current;
      if (!range) return;
      const { min, max } = readSliderValues(range, currentMinPrice, currentMaxPrice);
      syncRefs(min, max);
    };

    syncCurrency();
    window.addEventListener('currency-updated', syncCurrency);
    return () => window.removeEventListener('currency-updated', syncCurrency);
  }, [currentMinPrice, currentMaxPrice, resetDragState, syncRefs]);

  useEffect(() => {
    if (filtersContext?.data?.priceRange) {
      const pr = filtersContext.data.priceRange as PriceRange;
      const { min, max } = readSliderValues(pr, currentMinPrice, currentMaxPrice);
      syncRefs(min, max, pr);
      return;
    }
    if (filtersContext === null) {
      fetchPriceRange();
    }
  }, [category, search, filtersContext?.data?.priceRange, filtersContext === null]);

  useEffect(() => {
    if (isDraggingRef.current || !priceRangeRef.current) return;
    const range = priceRangeRef.current;
    const { min, max } = readSliderValues(range, currentMinPrice, currentMaxPrice);
    syncRefs(min, max);
  }, [currentMinPrice, currentMaxPrice, priceRange, syncRefs]);

  const fetchPriceRange = async () => {
    try {
      const language = getStoredLanguage();
      const params: Record<string, string> = { lang: language };
      if (category) params.category = category;
      if (search) params.search = search;

      const response = await apiClient.get<PriceRange>('/api/v1/products/price-range', { params });
      const { min, max } = readSliderValues(response, currentMinPrice, currentMaxPrice);
      syncRefs(min, max, response);
    } catch (error) {
      console.error('Error fetching price range:', error);
    }
  };

  const applyPriceFilter = useCallback(() => {
    const range = priceRangeRef.current;
    if (!range) return;

    const nextMin = minPriceRef.current;
    const nextMax = maxPriceRef.current;
    const shouldApplyMin = nextMin !== range.min;
    const shouldApplyMax = nextMax !== range.max;

    if (!shouldApplyMin && !shouldApplyMax) return;

    const params = new URLSearchParams(searchParams.toString());

    if (shouldApplyMin) {
      params.set('minPrice', nextMin.toString());
    } else {
      params.delete('minPrice');
    }

    if (shouldApplyMax) {
      params.set('maxPrice', nextMax.toString());
    } else {
      params.delete('maxPrice');
    }

    params.delete('page');

    const nextQueryString = params.toString();
    if (nextQueryString === searchParams.toString()) return;

    const href = warmShopNavigationFromSearchParams(
      router,
      params,
      getStoredLanguage(),
      pathname,
    );
    router.replace(href, { scroll: false });
  }, [pathname, router, searchParams]);

  const updatePriceFromClientX = useCallback((clientX: number) => {
    const dragging = isDraggingRef.current;
    const range = priceRangeRef.current;
    if (!dragging || !range || !sliderRef.current) return;

    const step = resolvePriceFilterStepInBase(range);
    const rect = sliderRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;

    const percentage = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const value = range.min + (percentage / 100) * (range.max - range.min);
    const roundedValue = roundPriceToStep(value, step);

    if (dragging === 'min') {
      const currentMax = maxPriceRef.current;
      const newMin = Math.max(range.min, Math.min(roundedValue, currentMax - step));
      minPriceRef.current = newMin;
      setMinPrice(newMin);
      return;
    }

    const currentMin = minPriceRef.current;
    const newMax = Math.min(range.max, Math.max(roundedValue, currentMin + step));
    maxPriceRef.current = newMax;
    setMaxPrice(newMax);
  }, []);

  const endDrag = useCallback(() => {
    if (!isDraggingRef.current) return;
    resetDragState();
    applyPriceFilter();
  }, [applyPriceFilter, resetDragState]);

  const startDrag = useCallback((type: 'min' | 'max', event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    isDraggingRef.current = type;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
      activePointerIdRef.current = event.pointerId;
    } catch {
      // ignore if capture is not supported
    }
  }, []);

  const handleTrackPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const range = priceRangeRef.current;
    if (event.button !== 0 || !range) return;
    const rect = sliderRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return;

    const step = resolvePriceFilterStepInBase(range);
    const percentage = ((event.clientX - rect.left) / rect.width) * 100;
    const value = range.min + (percentage / 100) * (range.max - range.min);
    const roundedValue = roundPriceToStep(value, step);
    const currentMin = minPriceRef.current;
    const currentMax = maxPriceRef.current;

    if (Math.abs(roundedValue - currentMin) < Math.abs(roundedValue - currentMax)) {
      const newMin = Math.max(range.min, Math.min(roundedValue, currentMax - step));
      minPriceRef.current = newMin;
      setMinPrice(newMin);
      startDrag('min', event);
    } else {
      const newMax = Math.min(range.max, Math.max(roundedValue, currentMin + step));
      maxPriceRef.current = newMax;
      setMaxPrice(newMax);
      startDrag('max', event);
    }
  };

  const handleSliderPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    updatePriceFromClientX(event.clientX);
  };

  const formatPrice = (price: number) => {
    if (typeof price !== 'number' || isNaN(price) || !isFinite(price)) {
      return formatCurrencyPrice(0, currency);
    }
    return formatCurrencyPrice(price, currency);
  };

  const isLoading = priceRange === null || (filtersContext?.loading && !priceRange);
  const hasProducts = priceRange?.hasProducts ?? (priceRange ? priceRange.max > priceRange.min || priceRange.min > 0 : false);

  if (isLoading) {
    return (
      <section className="border-b border-[#E2E8F0] pb-6">
        <h3 className="text-base font-semibold leading-6 tracking-[-0.02em] text-[#314158]">
          {t('products.filters.price.sectionTitle')}
        </h3>
        <div className="mt-4 h-2 animate-pulse rounded-full bg-[#E2E8F0]" aria-hidden />
        <p className="mt-3 text-sm text-[#62748E]">{t('products.filters.price.loading')}</p>
      </section>
    );
  }

  if (!hasProducts) {
    return null;
  }

  const boundsMin = priceRange.min;
  const boundsMax = priceRange.max;
  const safeMinPrice =
    typeof minPrice === 'number' && !isNaN(minPrice) && isFinite(minPrice) ? minPrice : boundsMin;
  const safeMaxPrice =
    typeof maxPrice === 'number' && !isNaN(maxPrice) && isFinite(maxPrice) ? maxPrice : boundsMax;

  const minPercentage = priceToSliderPercentage(safeMinPrice, boundsMin, boundsMax);
  const maxPercentage = priceToSliderPercentage(safeMaxPrice, boundsMin, boundsMax);

  return (
    <section className="border-b border-[#E2E8F0] pb-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold leading-6 tracking-[-0.02em] text-[#314158]">
          {t('products.filters.price.sectionTitle')}
        </h3>
        <p className="text-base font-bold leading-6 tracking-[-0.02em] text-black">
          {formatPrice(safeMinPrice)} - {formatPrice(safeMaxPrice)}
        </p>
      </div>

      <div className="mt-4">
        <div
          ref={sliderRef}
          className="relative h-2 touch-none cursor-pointer rounded-full bg-[#E2E8F0]"
          onPointerDown={handleTrackPointerDown}
          onPointerMove={handleSliderPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div
            className="absolute h-2 rounded-full bg-[#3BA3E3]"
            style={{
              left: `${minPercentage}%`,
              width: `${maxPercentage - minPercentage}%`,
            }}
          />

          <div
            className="absolute z-10 flex h-8 w-8 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
            style={{ left: `${minPercentage}%`, top: '50%', transform: 'translate(-50%, -50%)' }}
            onPointerDown={(event) => {
              event.stopPropagation();
              startDrag('min', event);
            }}
          >
            <div className="h-5 w-5 rounded-full border border-[#E2E8F0] bg-white shadow-sm transition-colors hover:border-[#2CA1E2] hover:shadow-md" />
          </div>

          <div
            className="absolute z-10 flex h-8 w-8 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
            style={{ left: `${maxPercentage}%`, top: '50%', transform: 'translate(-50%, -50%)' }}
            onPointerDown={(event) => {
              event.stopPropagation();
              startDrag('max', event);
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
