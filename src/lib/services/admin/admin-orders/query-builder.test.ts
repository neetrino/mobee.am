import { describe, expect, it } from 'vitest';
import { buildOrderWhereClause } from './query-builder';

describe('buildOrderWhereClause', () => {
  it('adds fulfillmentStatus filter when provided', () => {
    const where = buildOrderWhereClause({ fulfillmentStatus: 'shipped' });
    expect(where).toEqual({
      AND: [{ fulfillmentStatus: 'shipped' }],
    });
  });

  it('combines fulfillmentStatus with other filters', () => {
    const where = buildOrderWhereClause({
      status: 'processing',
      paymentStatus: 'paid',
      fulfillmentStatus: 'delivered',
    });

    expect(where).toEqual({
      AND: [
        { status: 'processing' },
        { paymentStatus: 'paid' },
        { fulfillmentStatus: 'delivered' },
      ],
    });
  });
});
