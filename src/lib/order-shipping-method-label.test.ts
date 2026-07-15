import { describe, expect, it } from 'vitest';
import { resolveOrderShippingMethodKind } from './order-shipping-method-label';

describe('resolveOrderShippingMethodKind', () => {
  it('maps pickup and delivery codes', () => {
    expect(resolveOrderShippingMethodKind('pickup')).toBe('pickup');
    expect(resolveOrderShippingMethodKind('delivery')).toBe('delivery');
  });

  it('maps Armenian and Latin store-pickup labels', () => {
    expect(resolveOrderShippingMethodKind('Խանութից վերցնել')).toBe('pickup');
    expect(resolveOrderShippingMethodKind('Xanutic vercnel')).toBe('pickup');
  });
});
