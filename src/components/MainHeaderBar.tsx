'use client';

import Link from 'next/link';
import { Montserrat } from 'next/font/google';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '../lib/api-client';
import { useTranslation } from '../lib/i18n-client';
import { getStoredLanguage } from '../lib/language';
import { MAIN_HEADER_FIGMA_ASSETS } from './main-header-figma-assets';
import { HEADER_STRIP_MIN_HEIGHT_LG, HEADER_STRIP_PADDING_Y } from './header-strip-layout';
import {
  ACCESSORIES_SLUG_PARTS,
  COMPUTERS_SLUG_PARTS,
  findCategoryBySlugParts,
  HEADPHONES_SLUG_PARTS,
  PHONES_SLUG_PARTS,
  TABLETS_SLUG_PARTS,
  type CategoryTreeNode,
  WATCHES_SLUG_PARTS,
} from '../lib/category-nav';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

type Category = CategoryTreeNode;

interface CategoriesResponse {
  data: Category[];
}

const MEGA_ROOT_LIMIT = 6;

function NavChevron() {
  return (
    <span className="relative size-3 shrink-0">
      <img
        src={MAIN_HEADER_FIGMA_ASSETS.chevronDown}
        alt=""
        width={12}
        height={12}
        className="pointer-events-none absolute inset-0 block size-3 max-w-none"
      />
    </span>
  );
}

function MegaNavItem({ category }: { category: Category }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasChildren = category.children && category.children.length > 0;

  const clearClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const scheduleClose = () => {
    clearClose();
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  useEffect(() => {
    return () => clearClose();
  }, []);

  return (
    <div
      className="relative shrink-0"
      onMouseEnter={() => {
        clearClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
    >
      <Link
        href={`/products?category=${encodeURIComponent(category.slug)}`}
        className="flex items-center gap-1 py-[0.15rem] text-[14px] font-semibold leading-5 text-[#374151] whitespace-nowrap hover:text-gray-900"
      >
        <span>{category.title}</span>
        <NavChevron />
      </Link>
      {hasChildren && open && (
        <div
          className="absolute left-0 top-full z-[45] pt-2 lg:left-1/2 lg:-translate-x-1/2"
          onMouseEnter={clearClose}
          onMouseLeave={scheduleClose}
        >
          <div className="max-h-[min(70vh,420px)] w-[min(100vw-2rem,280px)] overflow-y-auto rounded-xl border border-gray-200/80 bg-white py-2 shadow-xl">
            <Link
              href={`/products?category=${encodeURIComponent(category.slug)}`}
              className="block px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
            >
              {category.title}
            </Link>
            <div className="border-t border-gray-100" />
            {category.children.map((child) => (
              <Link
                key={child.id}
                href={`/products?category=${encodeURIComponent(child.slug)}`}
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              >
                {child.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function MainHeaderBar() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);

  const loadCategories = useCallback(async () => {
    try {
      const lang = getStoredLanguage();
      const response = await apiClient.get<CategoriesResponse>('/api/v1/categories/tree', {
        params: { lang },
      });
      setCategories(response.data || []);
    } catch {
      setCategories([]);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    const onLang = () => void loadCategories();
    window.addEventListener('language-updated', onLang);
    return () => window.removeEventListener('language-updated', onLang);
  }, [loadCategories]);

  const openSearch = () => {
    window.dispatchEvent(new Event('mobee:open-search'));
  };

  const phonesCategory = useMemo(
    () => findCategoryBySlugParts(categories, PHONES_SLUG_PARTS),
    [categories],
  );
  const tabletsCategory = useMemo(
    () => findCategoryBySlugParts(categories, TABLETS_SLUG_PARTS),
    [categories],
  );
  const computersCategory = useMemo(
    () => findCategoryBySlugParts(categories, COMPUTERS_SLUG_PARTS),
    [categories],
  );
  const watchesCategory = useMemo(
    () => findCategoryBySlugParts(categories, WATCHES_SLUG_PARTS),
    [categories],
  );
  const headphonesCategory = useMemo(
    () => findCategoryBySlugParts(categories, HEADPHONES_SLUG_PARTS),
    [categories],
  );
  const accessoriesCategory = useMemo(
    () => findCategoryBySlugParts(categories, ACCESSORIES_SLUG_PARTS),
    [categories],
  );

  const megaRoots = useMemo(() => {
    const quickIds = new Set<string>();
    if (phonesCategory) quickIds.add(phonesCategory.id);
    if (tabletsCategory) quickIds.add(tabletsCategory.id);
    if (computersCategory) quickIds.add(computersCategory.id);
    if (watchesCategory) quickIds.add(watchesCategory.id);
    if (headphonesCategory) quickIds.add(headphonesCategory.id);
    if (accessoriesCategory) quickIds.add(accessoriesCategory.id);
    return categories.filter((c) => !quickIds.has(c.id)).slice(0, MEGA_ROOT_LIMIT);
  }, [
    categories,
    phonesCategory,
    tabletsCategory,
    computersCategory,
    watchesCategory,
    headphonesCategory,
    accessoriesCategory,
  ]);

  const phonesCategoryHref = useMemo(() => {
    if (phonesCategory) return `/products?category=${encodeURIComponent(phonesCategory.slug)}`;
    return '/products';
  }, [phonesCategory]);

  return (
    <div
      className={`border-x border-b border-[#e5e7eb] bg-[rgba(255,255,255,0.7)] backdrop-blur-[6px] ${montserrat.className}`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className={`flex flex-col gap-[0.45rem] ${HEADER_STRIP_PADDING_Y} ${HEADER_STRIP_MIN_HEIGHT_LG} lg:flex-row lg:items-center lg:justify-between lg:gap-[0.9rem] xl:gap-[1.5rem]`}
        >
          <div className="flex w-full min-w-0 shrink-0 flex-col gap-[0.45rem] sm:flex-row sm:items-center sm:gap-4 lg:w-auto lg:max-w-none">
            <div className="min-w-0 w-full sm:flex-1 lg:max-w-[253px] lg:flex-[0_0_253px]">
              <button
                type="button"
                onClick={openSearch}
                className="relative w-full cursor-text rounded-[9999px] border border-[#e5e7eb] bg-[rgba(255,255,255,0.5)] py-[0.45rem] pl-12 pr-4 text-left transition-colors hover:bg-[rgba(255,255,255,0.85)]"
                aria-label={t('common.ariaLabels.search')}
              >
                <span className="pointer-events-none absolute left-4 top-1/2 size-6 -translate-y-1/2">
                  <img
                    src={MAIN_HEADER_FIGMA_ASSETS.searchIcon}
                    alt=""
                    width={24}
                    height={24}
                    className="block size-6 max-w-none"
                  />
                </span>
                <span className="block text-[14px] font-normal leading-normal text-[#6b7280]">
                  {t('common.mainHeader.searchPlaceholder')}
                </span>
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-4 sm:gap-10 sm:ml-12 lg:ml-[4.2rem]">
              <Link
                href={phonesCategoryHref}
                className="flex shrink-0 items-center gap-1 self-start py-[0.15rem] text-[14px] font-semibold leading-5 text-[#374151] whitespace-nowrap hover:text-gray-900 sm:self-auto"
              >
                <span>{t('common.mainHeader.phonesLink')}</span>
                <NavChevron />
              </Link>
              {tabletsCategory ? (
                <MegaNavItem category={tabletsCategory} />
              ) : (
                <Link
                  href="/products"
                  className="flex shrink-0 items-center gap-1 py-[0.15rem] text-[14px] font-semibold leading-5 text-[#374151] whitespace-nowrap hover:text-gray-900"
                >
                  <span>{t('common.mainHeader.tabletsLink')}</span>
                  <NavChevron />
                </Link>
              )}
              {computersCategory ? (
                <MegaNavItem category={computersCategory} />
              ) : (
                <Link
                  href="/products"
                  className="flex shrink-0 items-center gap-1 py-[0.15rem] text-[14px] font-semibold leading-5 text-[#374151] whitespace-nowrap hover:text-gray-900"
                >
                  <span>{t('common.mainHeader.computersLink')}</span>
                  <NavChevron />
                </Link>
              )}
              {watchesCategory ? (
                <MegaNavItem category={watchesCategory} />
              ) : (
                <Link
                  href="/products"
                  className="flex shrink-0 items-center gap-1 py-[0.15rem] text-[14px] font-semibold leading-5 text-[#374151] whitespace-nowrap hover:text-gray-900"
                >
                  <span>{t('common.mainHeader.watchesLink')}</span>
                  <NavChevron />
                </Link>
              )}
              {headphonesCategory ? (
                <MegaNavItem category={headphonesCategory} />
              ) : (
                <Link
                  href="/products"
                  className="flex shrink-0 items-center gap-1 py-[0.15rem] text-[14px] font-semibold leading-5 text-[#374151] whitespace-nowrap hover:text-gray-900"
                >
                  <span>{t('common.mainHeader.headphonesLink')}</span>
                  <NavChevron />
                </Link>
              )}
              {accessoriesCategory ? (
                <MegaNavItem category={accessoriesCategory} />
              ) : (
                <Link
                  href="/products"
                  className="flex shrink-0 items-center gap-1 py-[0.15rem] text-[14px] font-semibold leading-5 text-[#374151] whitespace-nowrap hover:text-gray-900"
                >
                  <span>{t('common.mainHeader.accessoriesLink')}</span>
                  <NavChevron />
                </Link>
              )}
            </div>
          </div>

          <nav
            className="flex min-w-0 flex-1 items-center gap-x-4 overflow-x-auto pb-[0.15rem] [-webkit-overflow-scrolling:touch] sm:gap-x-6 lg:justify-end lg:gap-x-8 lg:pb-0 xl:gap-x-10 scrollbar-hide"
            aria-label={t('common.navigation.categories')}
          >
            <div className="flex min-w-0 items-center gap-x-4 sm:gap-x-6 lg:gap-x-8 xl:gap-x-10 sm:ml-12 lg:ml-[4.2rem]">
              {megaRoots.map((cat) => (
                <MegaNavItem key={cat.id} category={cat} />
              ))}
            </div>
            <Link
              href="/products"
              className="shrink-0 py-[0.15rem] text-[14px] font-bold leading-5 whitespace-nowrap text-[#ef4444] hover:text-[#dc2626]"
            >
              {t('common.mainHeader.specialOffers')}
            </Link>
          </nav>
        </div>
      </div>
    </div>
  );
}
