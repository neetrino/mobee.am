import type { CSSProperties } from 'react';
import {
  SHOP_FILTER_SIDEBAR_BODY_SCROLL_CLASS,
  SHOP_FILTER_SIDEBAR_BOTTOM_OFFSET_CSS,
  SHOP_FILTER_SIDEBAR_SCROLL_CLASS,
  SHOP_FILTER_SIDEBAR_TOP_OFFSET_CSS,
  SHOP_FILTER_SIDEBAR_WIDTH_CSS,
} from './shop-layout.constants';

export function ShopFiltersAsideFallback() {
  return (
    <aside
      className={`hidden lg:flex lg:w-[var(--shop-filter-aside-width)] lg:flex-shrink-0 lg:self-start lg:sticky lg:top-[var(--shop-filter-sidebar-top-offset)] lg:bg-white ${SHOP_FILTER_SIDEBAR_SCROLL_CLASS}`}
      style={
        {
          ['--shop-filter-aside-width']: SHOP_FILTER_SIDEBAR_WIDTH_CSS,
          ['--shop-filter-sidebar-top-offset']: SHOP_FILTER_SIDEBAR_TOP_OFFSET_CSS,
          ['--shop-filter-sidebar-bottom-offset']: SHOP_FILTER_SIDEBAR_BOTTOM_OFFSET_CSS,
        } as CSSProperties
      }
    >
      <div className="shrink-0 px-6 pt-6 pb-4">
        <div className="h-8 w-24 animate-pulse rounded bg-gray-200" />
      </div>
      <div className={`${SHOP_FILTER_SIDEBAR_BODY_SCROLL_CLASS} space-y-6`}>
        <div className="h-24 animate-pulse rounded bg-gray-200" />
        <div className="h-32 animate-pulse rounded bg-gray-200" />
        <div className="h-32 animate-pulse rounded bg-gray-200" />
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
