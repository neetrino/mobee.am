import { describe, expect, it } from 'vitest';
import {
  clearLazyTranslationStore,
  ensureNamespace,
  hasLoadedNamespace,
  seedStorefrontLocale,
  syncLoadNamespace,
} from './i18n-lazy-loader';

describe('lazy translation cache', () => {
  it('keeps a previously loaded namespace after switching storefront locale', async () => {
    await ensureNamespace('hy', 'checkout');
    expect(hasLoadedNamespace('hy', 'checkout')).toBe(true);

    seedStorefrontLocale('ru');
    seedStorefrontLocale('en');
    seedStorefrontLocale('hy');

    expect(syncLoadNamespace('hy', 'checkout')).not.toBeNull();
  });

  it('does not reload a namespace that is already in memory', async () => {
    await ensureNamespace('hy', 'orders');
    const first = syncLoadNamespace('hy', 'orders');
    await ensureNamespace('hy', 'orders');
    expect(syncLoadNamespace('hy', 'orders')).toBe(first);
  });

  it('restores only seeded namespaces after an explicit store clear', async () => {
    await ensureNamespace('hy', 'profile');
    expect(hasLoadedNamespace('hy', 'profile')).toBe(true);
    clearLazyTranslationStore();
    expect(hasLoadedNamespace('hy', 'profile')).toBe(false);
    expect(hasLoadedNamespace('hy', 'common')).toBe(true);
  });
});
