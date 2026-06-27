import { describe, expect, it } from 'vitest';
import {
  priceToSliderPercentage,
  resolvePriceFilterStepInBase,
  roundPriceToStep,
  syncPriceFilterValuesFromUrl,
} from './resolve-price-filter-step';

describe('resolvePriceFilterStepInBase', () => {
  it('uses USD step regardless of display currency settings', () => {
    const step = resolvePriceFilterStepInBase({
      min: 0,
      max: 4000,
      stepSize: null,
      stepSizePerCurrency: { AMD: 50000, USD: 100 },
    });
    expect(step).toBe(40);
  });

  it('falls back to legacy stepSize when USD step is missing', () => {
    const step = resolvePriceFilterStepInBase({
      min: 0,
      max: 4000,
      stepSize: 50,
      stepSizePerCurrency: { AMD: 50000 },
    });
    expect(step).toBe(40);
  });

  it('caps step for smooth dragging on wide ranges', () => {
    const step = resolvePriceFilterStepInBase({
      min: 0,
      max: 4000,
      stepSize: 5000,
      stepSizePerCurrency: null,
    });
    expect(step).toBe(40);
  });
});

describe('roundPriceToStep', () => {
  it('rounds to step without collapsing small values', () => {
    expect(roundPriceToStep(2000, 125)).toBe(2000);
    expect(roundPriceToStep(50, 125)).toBe(0);
  });
});

describe('priceToSliderPercentage', () => {
  it('returns 0 when range span is zero', () => {
    expect(priceToSliderPercentage(10, 5, 5)).toBe(0);
  });
});

describe('syncPriceFilterValuesFromUrl', () => {
  it('uses URL values when present', () => {
    expect(
      syncPriceFilterValuesFromUrl({ min: 0, max: 4000 }, '500', '3000'),
    ).toEqual({ min: 500, max: 3000 });
  });

  it('clamps URL values inside category bounds', () => {
    expect(
      syncPriceFilterValuesFromUrl({ min: 30, max: 62.5 }, '0', '100'),
    ).toEqual({ min: 30, max: 62.5 });
  });

  it('resets invalid URL range to bounds', () => {
    expect(
      syncPriceFilterValuesFromUrl({ min: 30, max: 62.5 }, '100', '20'),
    ).toEqual({ min: 30, max: 62.5 });
  });
});
