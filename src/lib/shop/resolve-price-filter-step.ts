import type { CurrencyCode } from '../currency';

export interface PriceFilterStepConfig {
  min: number;
  max: number;
  stepSize?: number | null;
  stepSizePerCurrency?: Partial<Record<CurrencyCode, number>> | null;
}

/**
 * Slider values are stored in USD (product base prices). Step size for dragging
 * is always derived from USD settings so display currency changes do not affect
 * handle sensitivity.
 */
export function resolvePriceFilterStepInBase(
  priceRange: PriceFilterStepConfig,
): number {
  const span = priceRange.max - priceRange.min;
  if (span <= 0) return 1;

  const perCurrency = priceRange.stepSizePerCurrency || {};
  let baseStep: number | null = null;

  if (perCurrency.USD && perCurrency.USD > 0) {
    baseStep = perCurrency.USD;
  } else if (priceRange.stepSize && priceRange.stepSize > 0) {
    baseStep = priceRange.stepSize;
  }

  const step = baseStep && baseStep > 0 ? baseStep : 1;
  return Math.max(1, Math.min(step, span / 100));
}

export function roundPriceToStep(value: number, step: number): number {
  if (!step || step <= 0) return Math.round(value);
  return Math.round(value / step) * step;
}

export function priceToSliderPercentage(
  value: number,
  min: number,
  max: number,
): number {
  const span = max - min;
  if (span <= 0) return 0;
  return ((value - min) / span) * 100;
}

export function syncPriceFilterValuesFromUrl(
  range: PriceFilterStepConfig,
  minFromUrl: string | null,
  maxFromUrl: string | null,
): { min: number; max: number } {
  const boundsMin = range.min;
  const boundsMax = range.max;

  let min = minFromUrl ? parseFloat(minFromUrl) : boundsMin;
  let max = maxFromUrl ? parseFloat(maxFromUrl) : boundsMax;

  if (!Number.isFinite(min)) min = boundsMin;
  if (!Number.isFinite(max)) max = boundsMax;

  min = Math.max(boundsMin, Math.min(min, boundsMax));
  max = Math.max(boundsMin, Math.min(max, boundsMax));

  if (min > max) {
    return { min: boundsMin, max: boundsMax };
  }

  return { min, max };
}
