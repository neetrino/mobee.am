'use client';

import dynamic from 'next/dynamic';
import { MobileFiltersDrawer } from '@/components/MobileFiltersDrawer';
import { MOBILE_FILTERS_EVENT } from '@/lib/events';
import type { ShopFilterSectionsProps } from './ShopFilterSections';

const ShopFilterSections = dynamic(
  () => import('./ShopFilterSections').then((mod) => ({ default: mod.ShopFilterSections })),
  {
    loading: () => (
      <div className="space-y-4 p-4" aria-hidden>
        <div className="h-10 animate-pulse rounded bg-gray-200" />
        <div className="h-24 animate-pulse rounded bg-gray-200" />
        <div className="h-24 animate-pulse rounded bg-gray-200" />
      </div>
    ),
  },
);

type ShopMobileFiltersDrawerProps = ShopFilterSectionsProps;

/**
 * Mobile filter drawer — filter UI chunk loads only when the drawer opens.
 */
export function ShopMobileFiltersDrawer(props: ShopMobileFiltersDrawerProps) {
  return (
    <MobileFiltersDrawer
      openEventName={MOBILE_FILTERS_EVENT}
      renderWhenOpen={() => <ShopFilterSections {...props} padded />}
    />
  );
}
