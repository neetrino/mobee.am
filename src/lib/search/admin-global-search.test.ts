import { describe, expect, it } from 'vitest';
import {
  ADMIN_GLOBAL_SEARCH_DEFAULT_LIMIT,
  ADMIN_GLOBAL_SEARCH_MAX_LIMIT,
  mapAdminGlobalOrderResult,
  mapAdminGlobalProductResult,
  parseAdminGlobalSearchLimit,
} from './admin-global-search';

describe('parseAdminGlobalSearchLimit', () => {
  it('returns default limit for invalid values', () => {
    expect(parseAdminGlobalSearchLimit(null)).toBe(ADMIN_GLOBAL_SEARCH_DEFAULT_LIMIT);
    expect(parseAdminGlobalSearchLimit('0')).toBe(ADMIN_GLOBAL_SEARCH_DEFAULT_LIMIT);
    expect(parseAdminGlobalSearchLimit('abc')).toBe(ADMIN_GLOBAL_SEARCH_DEFAULT_LIMIT);
  });

  it('caps limit by max limit', () => {
    expect(parseAdminGlobalSearchLimit('100')).toBe(ADMIN_GLOBAL_SEARCH_MAX_LIMIT);
  });
});

describe('admin global search mappers', () => {
  it('maps product search result shape', () => {
    expect(
      mapAdminGlobalProductResult({
        id: 'p1',
        title: 'Phone',
        slug: 'phone',
        price: 100,
        stock: 2,
      })
    ).toEqual({
      entity: 'product',
      id: 'p1',
      title: 'Phone',
      slug: 'phone',
      price: 100,
      stock: 2,
    });
  });

  it('maps order search result shape', () => {
    expect(
      mapAdminGlobalOrderResult({
        id: 'o1',
        number: 'ORD-1',
        status: 'pending',
        paymentStatus: 'unpaid',
        total: 200,
        customerEmail: 'user@example.com',
      })
    ).toEqual({
      entity: 'order',
      id: 'o1',
      number: 'ORD-1',
      status: 'pending',
      paymentStatus: 'unpaid',
      total: 200,
      customerEmail: 'user@example.com',
    });
  });
});
