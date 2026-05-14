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
import { useShopCatalog, type ShopCatalogProduct } from './useShopCatalog';

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

  const getPaginationPages = (totalPages: number, current: number): (number | 'ellipsis')[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const set = new Set<number>([1, totalPages, current - 1, current, current + 1]);
    const sorted = Array.from(set).filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
    const out: (number | 'ellipsis')[] = [];
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i]! - sorted[i - 1]! > 1) out.push('ellipsis');
      out.push(sorted[i]!);
    }
    return out;
  };

  const meta = productsData?.meta;
  const total = meta?.total ?? 0;
  const totalPages = meta?.totalPages ?? 0;

  return (
    <div className="min-w-0 w-full flex-1 py-4">
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
                className="mt-12 flex w-full items-center justify-center"
                aria-label="Pagination"
              >
                <div className="inline-flex max-w-full flex-wrap items-center justify-center gap-2 rounded-[9999px] px-2 py-2 sm:px-3">
                  {page > 1 ? (
                    <Link
                      href={buildPaginationUrl(page - 1)}
                      className="inline-flex h-10 items-center justify-center rounded-[9999px] border border-transparent px-4 text-sm font-medium text-[#0F172B] transition-colors hover:border-[#d8dbe1] hover:bg-[#f6f7f9]"
                    >
                      {t('common.pagination.previous')}
                    </Link>
                  ) : (
                    <span className="inline-flex h-10 items-center justify-center rounded-[9999px] border border-transparent px-4 text-sm font-medium text-[#9AA4B2]">
                      {t('common.pagination.previous')}
                    </span>
                  )}

                  <div className="mx-1 h-6 w-px bg-[#E2E8F0]" aria-hidden />

                  {getPaginationPages(totalPages, page).map((item, idx) =>
                    item === 'ellipsis' ? (
                      <span
                        key={`ellipsis-${idx}`}
                        className="inline-flex h-10 min-w-10 items-center justify-center text-sm font-medium text-[#9AA4B2]"
                        aria-hidden
                      >
                        ...
                      </span>
                    ) : item === page ? (
                      <span
                        key={item}
                        className="inline-flex h-10 min-w-10 items-center justify-center rounded-[9999px] bg-[#2DB2FF] px-3 text-sm font-semibold text-white"
                        aria-current="page"
                      >
                        {item}
                      </span>
                    ) : (
                      <Link
                        key={item}
                        href={buildPaginationUrl(item)}
                        className="inline-flex h-10 min-w-10 items-center justify-center rounded-[9999px] border border-transparent px-3 text-sm font-medium text-[#0F172B] transition-colors hover:border-[#d8dbe1] hover:bg-[#f6f7f9]"
                      >
                        {item}
                      </Link>
                    ),
                  )}

                  <div className="mx-1 h-6 w-px bg-[#E2E8F0]" aria-hidden />

                  {page < totalPages ? (
                    <Link
                      href={buildPaginationUrl(page + 1)}
                      className="inline-flex h-10 items-center justify-center rounded-[9999px] border border-transparent px-4 text-sm font-medium text-[#0F172B] transition-colors hover:border-[#d8dbe1] hover:bg-[#f6f7f9]"
                    >
                      {t('common.pagination.next')}
                    </Link>
                  ) : (
                    <span className="inline-flex h-10 items-center justify-center rounded-[9999px] border border-transparent px-4 text-sm font-medium text-[#9AA4B2]">
                      {t('common.pagination.next')}
                    </span>
                  )}
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
