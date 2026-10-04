'use client';

import dynamic from 'next/dynamic';
import type { CSSProperties } from 'react';
import { useTranslation } from '@/lib/i18n-client';
import { useDesktopViewport } from '@/components/hooks/useDesktopViewport';
import {
  SHOP_FILTER_SIDEBAR_BODY_CLASS,
  SHOP_FILTER_SIDEBAR_CLASS,
  SHOP_FILTER_SIDEBAR_WIDTH_CSS,
} from '@/app/[locale]/shop/shop-layout.constants';
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
 * Desktop-only filter aside — natural height, scrolls with the page (Marco-style).
 */
export function ShopDesktopFiltersAside(props: ShopDesktopFiltersAsideProps) {
  const { t } = useTranslation();
  const isDesktop = useDesktopViewport();

  if (!isDesktop) {
    return null;
  }

  const style = {
    ['--shop-filter-aside-width']: SHOP_FILTER_SIDEBAR_WIDTH_CSS,
  } as CSSProperties;

  return (
    <aside className={SHOP_FILTER_SIDEBAR_CLASS} style={style} data-shop-filter-aside>
      <div className={SHOP_FILTER_SIDEBAR_BODY_CLASS}>
        <h2 className="mb-6 text-xl font-bold leading-7 tracking-[-0.02em] text-[#0F172B]">
          {t('products.filters.sidebar.title')}
        </h2>
        <ShopFilterSections {...props} />
      </div>
    </aside>
  );
}
