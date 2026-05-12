'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SlidersHorizontal } from 'lucide-react';
import { useTranslation } from '../lib/i18n-client';
import { MOBILE_FILTERS_EVENT } from '@/lib/events';
import { PRODUCT_SORT_OPTIONS, type ProductSortOption } from '@/lib/products/sort';
import {
  PRODUCTS_VIEW_MODE_CHANGED_EVENT,
  PRODUCTS_VIEW_MODE_STORAGE_KEY,
  parseProductListingViewMode,
  persistProductListingViewMode,
  type ProductListingViewMode,
} from '@/lib/products/view-mode';

const SORT_OPTIONS: ProductSortOption[] = [...PRODUCT_SORT_OPTIONS];

/** Filter + sort pill chrome on mobile (`lg` uses desktop sizing on the sort control). */
const SHOP_MOBILE_TOOLBAR_PILL_BOX_CLASS = 'h-10 px-3 py-1.5';

/** Grid listing icon: 24px viewBox, +5% display size vs default toolbar icons. */
const SHOP_GRID_LISTING_ICON_DISPLAY_PX = 24 * 1.05;

function getSortLabel(sort: ProductSortOption, t: (key: string) => string): string {
  switch (sort) {
    case 'bestseller':
      return t('products.header.sort.bestsellers');
    case 'price-asc':
      return t('products.header.sort.priceAsc');
    case 'price-desc':
      return t('products.header.sort.priceDesc');
    case 'name-asc':
      return t('products.header.sort.nameAsc');
    case 'name-desc':
      return t('products.header.sort.nameDesc');
    default:
      return t('products.header.sortBy');
  }
}

export function ShopSortFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [listingMode, setListingMode] = useState<ProductListingViewMode>('grid-2');
  const containerRef = useRef<HTMLDivElement | null>(null);

  const isListActive = listingMode === 'list';
  const isGridActive = listingMode === 'grid-2' || listingMode === 'grid-3';

  const activeSort = useMemo<ProductSortOption>(() => {
    const sort = searchParams.get('sort');
    return SORT_OPTIONS.includes(sort as ProductSortOption) ? (sort as ProductSortOption) : 'default';
  }, [searchParams]);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, []);

  useEffect(() => {
    setListingMode(parseProductListingViewMode(localStorage.getItem(PRODUCTS_VIEW_MODE_STORAGE_KEY)));
    const onListingChanged = (event: Event) => {
      const detail = (event as CustomEvent<ProductListingViewMode>).detail;
      setListingMode(parseProductListingViewMode(detail ?? null));
    };
    window.addEventListener(PRODUCTS_VIEW_MODE_CHANGED_EVENT, onListingChanged);
    return () => window.removeEventListener(PRODUCTS_VIEW_MODE_CHANGED_EVENT, onListingChanged);
  }, []);

  const applySort = (sort: ProductSortOption) => {
    const params = new URLSearchParams(searchParams.toString());
    if (sort === 'default') {
      params.delete('sort');
    } else {
      params.set('sort', sort);
    }
    params.delete('page');
    setOpen(false);
    const query = params.toString();
    router.push(query ? `/shop?${query}` : '/shop');
  };

  const applyListingMode = (mode: ProductListingViewMode) => {
    persistProductListingViewMode(mode);
  };

  const openMobileFilters = () => {
    window.dispatchEvent(new Event(MOBILE_FILTERS_EVENT));
  };

  return (
    <div
      className={`relative flex w-full items-center max-lg:justify-between lg:gap-[10px] ${open ? 'z-[100]' : 'z-10'}`}
    >
      <button
        type="button"
        onClick={openMobileFilters}
        className={`flex shrink-0 items-center gap-1.5 rounded-[9999px] border border-[#4B5563] ${SHOP_MOBILE_TOOLBAR_PILL_BOX_CLASS} lg:hidden`}
        aria-label={t('products.mobileFilters.title')}
      >
        <SlidersHorizontal className="h-4 w-4 shrink-0 text-[#4B5563]" aria-hidden />
        <span className="max-w-[7rem] truncate text-left text-[13px] font-normal leading-4 text-[#6B7280]">
          {t('products.header.filters')}
        </span>
      </button>

      <div
        ref={containerRef}
        className="relative min-w-0 w-full max-w-[min(168px,calc(100vw-8rem))] max-lg:shrink-0 lg:max-w-[226px] lg:w-full"
      >
        <button
          type="button"
          onClick={() => setOpen((currentOpen) => !currentOpen)}
          className={`relative flex w-full items-center justify-between gap-1.5 rounded-[9999px] border border-[#4B5563] ${SHOP_MOBILE_TOOLBAR_PILL_BOX_CLASS} lg:h-12 lg:gap-2 lg:px-[21px] lg:pb-[13px] lg:pt-[12px]`}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={t('products.header.sortProducts')}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="hidden h-6 w-6 shrink-0 lg:block"
          >
            <path d="M4 6H20" stroke="#4B5563" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M7 12H17" stroke="#4B5563" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M10 18H14" stroke="#4B5563" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <span className="min-w-0 flex-1 truncate text-left text-[13px] font-normal leading-[14px] text-[#6B7280] max-lg:absolute max-lg:left-[20px] max-lg:right-10 max-lg:flex max-lg:items-center max-lg:justify-start lg:static lg:inset-auto lg:text-[14px] lg:leading-[20px]">
            {getSortLabel(activeSort, t)}
          </span>
          <svg
            viewBox="0 0 18 18"
            fill="none"
            className={`absolute right-3 top-1/2 h-3.5 w-3.5 shrink-0 -translate-y-1/2 transition-transform lg:relative lg:right-auto lg:top-auto lg:translate-y-0 lg:h-[18px] lg:w-[18px] ${open ? 'rotate-180' : ''}`}
            aria-hidden="true"
          >
            <path d="M4.5 6.75L9 11.25L13.5 6.75" stroke="#6B7280" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>

        {open && (
          <div className="absolute left-0 top-[calc(100%+8px)] z-[110] w-full rounded-2xl border border-[#E2E8F0] bg-white p-2 shadow-[0_12px_30px_rgba(15,23,43,0.12)]">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => applySort(option)}
                className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                  option === activeSort
                    ? 'bg-[#EFF6FF] font-medium text-[#0F172B]'
                    : 'text-[#475569] hover:bg-[#F8FAFC]'
                }`}
              >
                {getSortLabel(option, t)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        className="hidden h-12 w-[110px] shrink-0 items-stretch gap-0.5 rounded-[90px] border border-[#4B5563] p-1 xl:flex"
        role="group"
        aria-label={`${t('products.header.viewModes.list')} / ${t('products.header.viewModes.grid2')}`}
      >
        <button
          type="button"
          onClick={() => applyListingMode('list')}
          aria-pressed={isListActive}
          aria-label={t('products.header.viewModes.list')}
          className={`flex flex-1 items-center justify-center rounded-[80px] transition-colors ${
            isListActive ? 'bg-[#2DB2FF]' : 'bg-transparent'
          }`}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            aria-hidden="true"
            className={`shrink-0 ${isListActive ? 'text-white' : 'text-[#4B5563]'}`}
          >
            <circle cx="8" cy="8" r="1.5" fill="currentColor" />
            <circle cx="8" cy="16" r="1.5" fill="currentColor" />
            <circle cx="8" cy="24" r="1.5" fill="currentColor" />
            <path d="M12.5 8H24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M12.5 16H24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M12.5 24H24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => applyListingMode('grid-2')}
          aria-pressed={isGridActive}
          aria-label={t('products.header.viewModes.grid2')}
          className={`flex flex-1 items-center justify-center rounded-[80px] transition-colors ${
            isGridActive ? 'bg-[#2DB2FF]' : 'bg-transparent'
          }`}
        >
          <svg
            width={SHOP_GRID_LISTING_ICON_DISPLAY_PX}
            height={SHOP_GRID_LISTING_ICON_DISPLAY_PX}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className={`shrink-0 ${isGridActive ? 'text-white' : 'text-[#4B5563]'}`}
          >
            <circle cx="6" cy="6" r="1.4" fill="currentColor" />
            <circle cx="12" cy="6" r="1.4" fill="currentColor" />
            <circle cx="18" cy="6" r="1.4" fill="currentColor" />
            <circle cx="6" cy="12" r="1.4" fill="currentColor" />
            <circle cx="12" cy="12" r="1.4" fill="currentColor" />
            <circle cx="18" cy="12" r="1.4" fill="currentColor" />
            <circle cx="6" cy="18" r="1.4" fill="currentColor" />
            <circle cx="12" cy="18" r="1.4" fill="currentColor" />
            <circle cx="18" cy="18" r="1.4" fill="currentColor" />
          </svg>
        </button>
      </div>
    </div>
  );
}
