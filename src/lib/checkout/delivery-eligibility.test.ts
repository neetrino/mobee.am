import { describe, expect, it } from 'vitest';
import { isDeliveryAvailableForSubtotalAmd } from './delivery-eligibility';

describe('delivery-eligibility', () => {
  it('disallows delivery below 50000 AMD', () => {
    expect(isDeliveryAvailableForSubtotalAmd(49_999)).toBe(false);
    expect(isDeliveryAvailableForSubtotalAmd(0)).toBe(false);
  });

  it('allows delivery at or above 50000 AMD', () => {
    expect(isDeliveryAvailableForSubtotalAmd(50_000)).toBe(true);
    expect(isDeliveryAvailableForSubtotalAmd(120_000)).toBe(true);
  });
});
