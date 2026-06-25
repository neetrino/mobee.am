'use client';

import dynamic from 'next/dynamic';
import type { CSSProperties } from 'react';
import { useTranslation } from '@/lib/i18n-client';
import { useDesktopViewport } from '@/components/hooks/useDesktopViewport';
import {
  SHOP_FILTER_SIDEBAR_SCROLL_CLASS,
  SHOP_FILTER_SIDEBAR_TOP_OFFSET_CSS,
  SHOP_FILTER_SIDEBAR_WIDTH_CSS,
} from '@/app/shop/shop-layout.constants';
import type { ShopFilterSectionsProps } from './ShopFilterSections';

const ShopFilterSections = dynamic(
  () => import('./ShopFilterSections').then((mod) => ({ default: mod.ShopFilterSections })),
  {
    loading: () => (
      <div className="space-y-4" aria-hidden>
        <div className="h-10 animate-pulse rounded bg-gray-200" />
        <div className="h-24 animate-pulse rounded bg-gray-200" />
        <div className="h-24 animate-pulse rounded bg-gray-200" />
      </div>
    ),
  },
);

type ShopDesktopFiltersAsideProps = ShopFilterSectionsProps;

/**
 * Desktop-only filter aside — skipped on mobile to avoid filter JS/API on first paint.
 */
export function ShopDesktopFiltersAside(props: ShopDesktopFiltersAsideProps) {
  const { t } = useTranslation();
  const isDesktop = useDesktopViewport();

  if (!isDesktop) {
    return null;
  }

  const style = {
    ['--shop-filter-aside-width']: SHOP_FILTER_SIDEBAR_WIDTH_CSS,
    ['--shop-filter-sidebar-top-offset']: SHOP_FILTER_SIDEBAR_TOP_OFFSET_CSS,
  } as CSSProperties;

  return (
    <aside
      className={`lg:w-[var(--shop-filter-aside-width)] lg:flex-shrink-0 lg:self-start lg:sticky lg:top-[var(--shop-filter-sidebar-top-offset)] lg:border-r lg:border-[#e7e7e7] lg:pr-0 ${SHOP_FILTER_SIDEBAR_SCROLL_CLASS}`}
      style={style}
    >
      <div className="bg-white px-6 pt-6">
        <div className="mb-6">
          <h2 className="text-base font-semibold leading-6 tracking-[-0.02em] text-[#0F172B]">
            {t('products.filters.sidebar.title')}
          </h2>
          <p className="mt-1 text-sm leading-5 tracking-[-0.01em] text-[#62748E]">
            {t('products.filters.sidebar.subtitle')}
          </p>
        </div>
        <ShopFilterSections {...props} />
      </div>
    </aside>
  );
}
