'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/lib/i18n/navigation';
import {
  CATALOG_MAX_PAGE_SIZE,
  SHOP_DESKTOP_GRID_COLUMNS,
  SHOP_PAGE_DEFAULT_LIMIT,
  SHOP_PRODUCT_ROW_HEIGHT_PX,
} from '@/lib/catalog/catalog.constants';
import { computeShopPageLimitFromFilterHeight } from '@/lib/shop/shop-page-limit';
import {
  LAYOUT_DESKTOP_MIN_WIDTH_MEDIA_QUERY,
  SHOP_LEGACY_DESKTOP_MEDIA_QUERY,
} from '@/lib/layout-breakpoints.constants';

/** Columns between storefront `lg` and legacy `xl` shop grid. */
const SHOP_COMPACT_DESKTOP_GRID_COLUMNS = 2;

const FILTER_ASIDE_SELECTOR = '[data-shop-filter-aside]';
const FILTER_SECTIONS_SELECTOR = '[data-shop-filter-sections]';
const PRODUCT_CARD_SELECTOR = '[data-shop-product-card]';

function readPositiveInt(raw: string | null, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, CATALOG_MAX_PAGE_SIZE);
}

function measureProductRowHeightPx(): number {
  const card = document.querySelector(PRODUCT_CARD_SELECTOR);
  if (!(card instanceof HTMLElement)) {
    return SHOP_PRODUCT_ROW_HEIGHT_PX;
  }
  const styles = window.getComputedStyle(card.parentElement ?? card);
  const gapRaw = styles.rowGap || styles.gap || '0';
  const gap = Number.parseFloat(gapRaw) || 0;
  return Math.max(card.getBoundingClientRect().height + gap, 1);
}

function desktopGridColumns(): number {
  return window.matchMedia(SHOP_LEGACY_DESKTOP_MEDIA_QUERY).matches
    ? SHOP_DESKTOP_GRID_COLUMNS
    : SHOP_COMPACT_DESKTOP_GRID_COLUMNS;
}

function measureFilterColumnHeightPx(): number {
  const aside = document.querySelector(FILTER_ASIDE_SELECTOR);
  if (aside instanceof HTMLElement && aside.scrollHeight > 0) {
    return aside.scrollHeight;
  }
  const sections = document.querySelector(FILTER_SECTIONS_SELECTOR);
  if (sections instanceof HTMLElement) {
    return sections.scrollHeight;
  }
  return 0;
}

/**
 * Desktop shop (Marco-style): one page of products fills roughly to the filter column
 * natural height (minimum 4 rows). Mobile keeps the shop default page size.
 */
export function useShopPageLimitFromFilters(): void {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lastAppliedLimitRef = useRef<number | null>(null);

  useEffect(() => {
    const desktopMq = window.matchMedia(LAYOUT_DESKTOP_MIN_WIDTH_MEDIA_QUERY);

    const syncLimit = () => {
      if (!desktopMq.matches) {
        return;
      }

      const filterHeight = measureFilterColumnHeightPx();
      if (filterHeight <= 0) {
        return;
      }

      const nextLimit = computeShopPageLimitFromFilterHeight(
        filterHeight,
        measureProductRowHeightPx(),
        desktopGridColumns(),
      );
      const currentLimit = readPositiveInt(
        searchParams.get('limit'),
        SHOP_PAGE_DEFAULT_LIMIT,
      );

      if (nextLimit === currentLimit || nextLimit === lastAppliedLimitRef.current) {
        return;
      }

      lastAppliedLimitRef.current = nextLimit;
      const params = new URLSearchParams(searchParams.toString());
      if (nextLimit === SHOP_PAGE_DEFAULT_LIMIT) {
        params.delete('limit');
      } else {
        params.set('limit', String(nextLimit));
      }
      params.delete('page');
      const qs = params.toString();
      router.replace(qs ? `/shop?${qs}` : '/shop', { scroll: false });
    };

    const observer = new ResizeObserver(() => {
      window.requestAnimationFrame(syncLimit);
    });

    const observeTargets = () => {
      const aside = document.querySelector(FILTER_ASIDE_SELECTOR);
      const sections = document.querySelector(FILTER_SECTIONS_SELECTOR);
      if (aside instanceof HTMLElement) observer.observe(aside);
      if (sections instanceof HTMLElement) observer.observe(sections);
    };

    observeTargets();
    desktopMq.addEventListener('change', syncLimit);
    syncLimit();
    const remountTimer = window.setTimeout(() => {
      observeTargets();
      syncLimit();
    }, 500);

    return () => {
      observer.disconnect();
      desktopMq.removeEventListener('change', syncLimit);
      window.clearTimeout(remountTimer);
    };
  }, [router, searchParams]);
}
