'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProductsHeader } from '@/components/ProductsHeader';
import { ProductsGrid } from '@/components/ProductsGrid';
import { ShopSortFilter } from '@/components/ShopSortFilter';
import type { LanguageCode } from '@/lib/language';
import type { ProductListPayload } from '@/lib/services/products-list-cached';
import { useTranslation } from '@/lib/i18n-client';
import { parseProductSortOption } from '@/lib/products/sort';
import {
  getPaginationPages,
  getPaginationPagesPhoneWindow,
  type PaginationPageItem,
} from '@/lib/pagination/get-pagination-pages';
import { useShopCatalog, type ShopCatalogProduct } from './useShopCatalog';

type ShopPaginationPageItemsProps = {
  items: PaginationPageItem[];
  currentPage: number;
  buildUrl: (pageNum: number) => string;
  keyPrefix: string;
  className: string;
};

function ShopPaginationPageItems({
  items,
  currentPage,
  buildUrl,
  keyPrefix,
  className,
}: ShopPaginationPageItemsProps) {
  return (
    <div className={`inline-flex flex-nowrap items-center gap-1 ${className}`.trim()}>
      {items.map((item, idx) =>
        item === 'ellipsis' ? (
          <span
            key={`${keyPrefix}-ellipsis-${idx}`}
            className="inline-flex h-10 min-w-9 shrink-0 items-center justify-center px-1 text-sm font-medium text-[#9AA4B2] sm:min-w-10 sm:px-0"
            aria-hidden
          >
            ...
          </span>
        ) : item === currentPage ? (
          <span
            key={`${keyPrefix}-page-${item}`}
            className="inline-flex h-10 min-w-9 shrink-0 items-center justify-center rounded-[9999px] bg-[#2DB2FF] px-2 text-sm font-semibold text-white sm:min-w-10 sm:px-3"
            aria-current="page"
          >
            {item}
          </span>
        ) : (
          <Link
            key={`${keyPrefix}-page-${item}`}
            href={buildUrl(item)}
            className="inline-flex h-10 min-w-9 shrink-0 items-center justify-center rounded-[9999px] border border-transparent px-2 text-sm font-medium text-[#0F172B] transition-colors hover:border-[#d8dbe1] hover:bg-[#f6f7f9] sm:min-w-10 sm:px-3"
          >
            {item}
          </Link>
        ),
      )}
    </div>
  );
}

export type ShopCatalogAreaProps = {
  initialPayload?: ProductListPayload;
  initialFiltersKey?: string;
  serverLanguage?: LanguageCode;
};

function ShopGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-x-2 gap-y-5 md:grid-cols-3 md:gap-5 lg:grid-cols-2 lg:gap-4 xl:grid-cols-3 xl:gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="aspect-[3/4] animate-pulse rounded-lg bg-gray-200"
          aria-hidden
        />
      ))}
    </div>
  );
}

export function ShopCatalogArea({
  initialPayload,
  initialFiltersKey,
  serverLanguage,
}: ShopCatalogAreaProps = {}) {
  const searchParams = useSearchParams();
  const { productsData, loading, error } = useShopCatalog({
    initialPayload,
    initialFiltersKey,
    serverLanguage,
  });
  const { t } = useTranslation();

  const page = parseInt(searchParams.get('page') || '1', 10);
  const sort = parseProductSortOption(searchParams.get('sort') ?? undefined);

  const normalizedProducts = useMemo(() => {
    const rows = productsData?.data ?? [];
    return rows.map(
      (p: ShopCatalogProduct & { labels?: ShopCatalogProduct['labels'] }) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        subtitle:
          typeof p.subtitle === 'string' && p.subtitle.trim().length > 0 ? p.subtitle.trim() : null,
        price: p.price,
        compareAtPrice: p.compareAtPrice ?? p.originalPrice ?? null,
        discountPercent: p.discountPercent ?? null,
        image: p.image ?? null,
        inStock: p.inStock ?? true,
        brand: p.brand ?? null,
        defaultVariantId: p.defaultVariantId ?? null,
        colors: p.colors ?? [],
        labels: p.labels ?? [],
        primaryCategoryId: p.primaryCategoryId ?? null,
        categoryIds: Array.isArray(p.categoryIds) ? [...p.categoryIds] : [],
        categories: Array.isArray(p.categories) ? p.categories : [],
      }),
    );
  }, [productsData]);

  const buildPaginationUrl = (num: number) => {
    const q = new URLSearchParams();
    q.set('page', num.toString());
    const currentLimit = searchParams.get('limit') || '12';
    q.set('limit', currentLimit);
    searchParams.forEach((v, k) => {
      if (k !== 'page' && k !== 'limit' && v) q.set(k, v);
    });
    return `/shop?${q.toString()}`;
  };

  const meta = productsData?.meta;
  const total = meta?.total ?? 0;
  const totalPages = meta?.totalPages ?? 0;

  return (
    <div className="min-w-0 w-full flex-1 pt-4 pb-0 lg:py-4">
      <div className="w-full">
        <ProductsHeader total={total} isCountPending={loading} />
      </div>

      <div className="w-full py-4">
        <nav className="mb-4 flex items-center text-sm" aria-label="Breadcrumb">
          <Link href="/" className="text-gray-500 transition-colors hover:text-gray-700">
            {t('common.navigation.home')}
          </Link>
          <span className="mx-2 text-gray-400">/</span>
          <span className="font-semibold text-gray-900">{t('common.navigation.products')}</span>
        </nav>
        <div className="mb-6 pt-2">
          <ShopSortFilter />
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {t('home.featured_products.errorLoading')}
          </div>
        )}

        {loading && !productsData ? (
          <ShopGridSkeleton />
        ) : normalizedProducts.length > 0 ? (
          <>
            <ProductsGrid products={normalizedProducts} sortBy={sort} />

            {totalPages > 1 && (
              <nav
                className="mt-6 flex w-full items-center justify-center sm:mt-10 md:mt-12"
                aria-label="Pagination"
              >
                <div className="w-full overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] scrollbar-hide">
                  <div className="flex w-max min-w-full justify-center px-1 sm:px-0">
                    <div className="inline-flex flex-nowrap items-center gap-1 rounded-[9999px] py-1 sm:gap-2 sm:py-2 sm:px-3">
                  {page > 1 ? (
                    <Link
                      href={buildPaginationUrl(1)}
                      className="inline-flex h-10 shrink-0 items-center justify-center rounded-[9999px] border border-transparent px-2 text-sm font-medium text-[#0F172B] transition-colors hover:border-[#d8dbe1] hover:bg-[#f6f7f9] sm:px-4"
                    >
                      {t('common.pagination.first')}
                    </Link>
                  ) : (
                    <span className="inline-flex h-10 shrink-0 items-center justify-center rounded-[9999px] border border-transparent px-2 text-sm font-medium text-[#9AA4B2] sm:px-4">
                      {t('common.pagination.first')}
                    </span>
                  )}

                  <div className="mx-0.5 h-6 w-px shrink-0 bg-[#E2E8F0] sm:mx-1" aria-hidden />

                  <ShopPaginationPageItems
                    items={getPaginationPagesPhoneWindow(totalPages, page)}
                    currentPage={page}
                    buildUrl={buildPaginationUrl}
                    keyPrefix="phone"
                    className="md:hidden"
                  />
                  <ShopPaginationPageItems
                    items={getPaginationPages(totalPages, page)}
                    currentPage={page}
                    buildUrl={buildPaginationUrl}
                    keyPrefix="tablet"
                    className="hidden md:inline-flex"
                  />

                  <div className="mx-0.5 h-6 w-px shrink-0 bg-[#E2E8F0] sm:mx-1" aria-hidden />

                  {page < totalPages ? (
                    <Link
                      href={buildPaginationUrl(totalPages)}
                      className="inline-flex h-10 shrink-0 items-center justify-center rounded-[9999px] border border-transparent px-2 text-sm font-medium text-[#0F172B] transition-colors hover:border-[#d8dbe1] hover:bg-[#f6f7f9] sm:px-4"
                    >
                      {t('common.pagination.last')}
                    </Link>
                  ) : (
                    <span className="inline-flex h-10 shrink-0 items-center justify-center rounded-[9999px] border border-transparent px-2 text-sm font-medium text-[#9AA4B2] sm:px-4">
                      {t('common.pagination.last')}
                    </span>
                  )}
                    </div>
                  </div>
                </div>
              </nav>
            )}
          </>
        ) : (
          !loading && (
            <div className="py-12 text-center">
              <p className="text-lg text-gray-500">{t('common.messages.noProductsFound')}</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
