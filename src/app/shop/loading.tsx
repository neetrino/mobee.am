import type { CSSProperties } from 'react';
import { SHOP_FILTER_SIDEBAR_WIDTH_CSS } from './shop-layout.constants';

/**
 * Instant route feedback while the shop shell streams (same idea as other route loading UI).
 */
export default function ShopLoading() {
  return (
    <div className="w-full max-w-full animate-pulse">
      <div className="mx-auto max-w-[1917px] px-4 pt-6 sm:px-6 lg:px-[53px]">
        <div className="h-8 w-56 rounded bg-gray-200" />
      </div>
      <div className="mx-auto mt-6 flex max-w-[1917px] flex-col gap-6 px-4 sm:px-6 lg:flex-row lg:px-[53px]">
        <div
          className="hidden h-[480px] w-full max-w-[var(--shop-filter-aside-width)] rounded-lg bg-gray-200 lg:block"
          style={
            {
              ['--shop-filter-aside-width']: SHOP_FILTER_SIDEBAR_WIDTH_CSS,
            } as CSSProperties
          }
        />
        <div className="min-w-0 flex-1 space-y-4 py-4 lg:pl-[53px]">
          <div className="h-5 w-40 rounded bg-gray-200" />
          <div className="h-10 max-w-md rounded bg-gray-200" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-lg bg-gray-200" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
