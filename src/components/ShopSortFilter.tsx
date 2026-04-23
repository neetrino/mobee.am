'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from '../lib/i18n-client';
import type { ProductSortOption } from '@/lib/products/sort';

const SORT_OPTIONS: ProductSortOption[] = ['default', 'price-asc', 'price-desc', 'name-asc', 'name-desc'];

function getSortLabel(sort: ProductSortOption, t: (key: string) => string): string {
  switch (sort) {
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
  const containerRef = useRef<HTMLDivElement | null>(null);

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

  return (
    <div ref={containerRef} className="relative w-full max-w-[275px]">
      <button
        type="button"
        onClick={() => setOpen((currentOpen) => !currentOpen)}
        className="flex w-full items-center justify-center gap-2 rounded-[9999px] border border-[#4B5563] px-[21px] pb-[13px] pt-[12px] text-left"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('products.header.sortProducts')}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
          <path d="M4 6H20" stroke="#4B5563" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M7 12H17" stroke="#4B5563" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M10 18H14" stroke="#4B5563" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <span className="min-w-0 truncate text-[14px] font-normal leading-[20px] text-[#6B7280]">
          {getSortLabel(activeSort, t)}
        </span>
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          <path d="M4.5 6.75L9 11.25L13.5 6.75" stroke="#6B7280" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-20 w-full rounded-2xl border border-[#E2E8F0] bg-white p-2 shadow-[0_12px_30px_rgba(15,23,43,0.12)]">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => applySort(option)}
              className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                option === activeSort ? 'bg-[#EFF6FF] font-medium text-[#0F172B]' : 'text-[#475569] hover:bg-[#F8FAFC]'
              }`}
            >
              {getSortLabel(option, t)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
