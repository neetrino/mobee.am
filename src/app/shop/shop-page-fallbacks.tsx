import type { CSSProperties } from 'react';
import {
  SHOP_FILTER_SIDEBAR_WIDTH_CSS,
} from './shop-layout.constants';

export function ShopFiltersAsideFallback() {
  return (
    <aside
      className="hidden lg:block lg:w-[var(--shop-filter-aside-width)] lg:flex-shrink-0 lg:self-start"
      style={
        {
          ['--shop-filter-aside-width']: SHOP_FILTER_SIDEBAR_WIDTH_CSS,
        } as CSSProperties
      }
    >
      <div className="animate-pulse space-y-6 bg-white px-6 pt-6">
        <div className="h-12 rounded bg-gray-200" />
        <div className="h-24 rounded bg-gray-200" />
        <div className="h-32 rounded bg-gray-200" />
        <div className="h-32 rounded bg-gray-200" />
      </div>
    </aside>
  );
}

export function ShopCatalogFallback() {
  return (
    <div className="min-w-0 w-full flex-1 pt-4 pb-0 lg:py-4">
      <div className="mb-6 h-8 w-48 animate-pulse rounded bg-gray-200" />
      <div className="mb-6 h-10 w-full max-w-md animate-pulse rounded bg-gray-200" />
      <div className="grid grid-cols-2 gap-x-2 gap-y-5 md:grid-cols-3 md:gap-5 lg:grid-cols-2 lg:gap-5 xl:grid-cols-3 xl:gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-[3/4] animate-pulse rounded-lg bg-gray-200" aria-hidden />
        ))}
      </div>
    </div>
  );
}
