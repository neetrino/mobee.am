import { describe, expect, it } from 'vitest';
import { buildStockAdjustmentsForCancel } from './order-mutations';

describe('buildStockAdjustmentsForCancel', () => {
  it('aggregates quantities by variant id', () => {
    const adjustments = buildStockAdjustmentsForCancel([
      { variantId: 'v1', quantity: 2 },
      { variantId: 'v2', quantity: 1 },
      { variantId: 'v1', quantity: 3 },
    ]);

    expect(adjustments).toEqual([
      { variantId: 'v1', quantity: 5 },
      { variantId: 'v2', quantity: 1 },
    ]);
  });

  it('returns empty array for empty items', () => {
    expect(buildStockAdjustmentsForCancel([])).toEqual([]);
  });
});
