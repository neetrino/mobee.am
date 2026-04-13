import Link from 'next/link';
import { Suspense } from 'react';
import { Button } from '@shop/ui';
import { apiClient } from '../../lib/api-client';
import { getStoredLanguage } from '../../lib/language';
import { t } from '../../lib/i18n';
import { PriceFilter } from '../../components/PriceFilter';
import { ColorFilter } from '../../components/ColorFilter';
import { SizeFilter } from '../../components/SizeFilter';
import { BrandFilter } from '../../components/BrandFilter';
import { ProductsHeader } from '../../components/ProductsHeader';
import { ProductsGrid } from '../../components/ProductsGrid';
import { CategoryNavigation } from '../../components/CategoryNavigation';
import { MobileFiltersDrawer } from '../../components/MobileFiltersDrawer';
import { ProductsFiltersProvider } from '../../components/ProductsFiltersProvider';
import { MOBILE_FILTERS_EVENT } from '../../lib/events';

const PAGE_CONTAINER = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8';
// Container for filters section to align with Header logo (same Y-axis)
// Header logo uses: pl-2 sm:pl-4 md:pl-6 lg:pl-8

interface Product {
  id: string;
  slug: string;
  title: string;
  price: number;
  compareAtPrice: number | null;
  image: string | null;
  inStock: boolean;
  brand: {
    id: string;
    name: string;
  } | null;
  labels?: Array<{
    id: string;
    type: 'text' | 'percentage';
    value: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    color: string | null;
  }>;
}

interface ProductsResponse {
  data: Product[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Fetch products (PRODUCTION SAFE)
 */
async function getProducts(
  page: number = 1,
  search?: string,
  category?: string,
  minPrice?: string,
  maxPrice?: string,
  colors?: string,
  sizes?: string,
  brand?: string,
  limit: number = 12
): Promise<ProductsResponse> {
  try {
    const language = getStoredLanguage();
    const params: Record<string, string> = {
      page: page.toString(),
      limit: limit.toString(),
      lang: language,
    };

    if (search?.trim()) params.search = search.trim();
    if (category?.trim()) params.category = category.trim();
    if (minPrice?.trim()) params.minPrice = minPrice.trim();
    if (maxPrice?.trim()) params.maxPrice = maxPrice.trim();
    if (colors?.trim()) params.colors = colors.trim();
    if (sizes?.trim()) params.sizes = sizes.trim();
    if (brand?.trim()) params.brand = brand.trim();

    const queryString = new URLSearchParams(params).toString();

    // Fallback chain: NEXT_PUBLIC_APP_URL -> VERCEL_URL -> localhost (for local dev)
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    const targetUrl = `${baseUrl}/api/v1/products?${queryString}`;
    const res = await fetch(targetUrl, {
      cache: "no-store"
    });

    if (!res.ok) throw new Error(`API failed: ${res.status}`);

    const response = await res.json();
    if (!response.data || !Array.isArray(response.data)) {
      return {
        data: [],
        meta: { total: 0, page: 1, limit: 12, totalPages: 0 }
      };
    }

    return response;

  } catch (e) {
    console.error("❌ PRODUCT ERROR", e);
    return {
      data: [],
      meta: { total: 0, page: 1, limit: 12, totalPages: 0 }
    };
  }
}

/**
 * PAGE
 */
export default async function ProductsPage({ searchParams }: any) {
  const params = searchParams ? await searchParams : {};
  const page = parseInt(params?.page || "1", 10);
  const limitParam = params?.limit?.toString().trim();
  const parsedLimit = limitParam && !Number.isNaN(parseInt(limitParam, 10))
    ? parseInt(limitParam, 10)
    : null;
  const perPage = parsedLimit ? Math.min(parsedLimit, 200) : 12;

  const productsData = await getProducts(
    page,
    params?.search,
    params?.category,
    params?.minPrice,
    params?.maxPrice,
    params?.colors,
    params?.sizes,
    params?.brand,
    perPage
  );

  // ------------------------------------
  // 🔧 FIX: normalize products 
  // add missing inStock, missing image fields 
  // ------------------------------------
  const normalizedProducts = productsData.data.map((p: any) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    price: p.price,
    compareAtPrice: p.compareAtPrice ?? p.originalPrice ?? null,
    image: p.image ?? null,
    inStock: p.inStock ?? true,      // ⭐ FIXED
    brand: p.brand ?? null,
    defaultVariantId: p.defaultVariantId ?? null,
    colors: p.colors ?? [],          // ⭐ Add colors array
    labels: p.labels ?? []            // ⭐ Add labels array (includes "Out of Stock" label)
  }));

  // FILTERS
  const colors = params?.colors;
  const sizes = params?.sizes;
  const brands = params?.brand;
  const selectedColors = colors ? colors.split(',').map((c: string) => c.trim().toLowerCase()) : [];
  const selectedSizes = sizes ? sizes.split(',').map((s: string) => s.trim()) : [];
  const selectedBrands = brands ? brands.split(',').map((b: string) => b.trim()) : [];

  // PAGINATION: 12 per page by default, preserve limit in URLs
  const buildPaginationUrl = (num: number) => {
    const q = new URLSearchParams();
    q.set("page", num.toString());
    const currentLimit = params?.limit ? String(params.limit) : "12";
    q.set("limit", currentLimit);
    Object.entries(params).forEach(([k, v]) => {
      if (k !== "page" && k !== "limit" && v && typeof v === "string") q.set(k, v);
    });
    return `/products?${q.toString()}`;
  };

  /** Page numbers (and ellipsis) to show in pagination */
  const getPaginationPages = (): (number | "ellipsis")[] => {
    const total = productsData.meta.totalPages;
    const current = page;
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const set = new Set<number>([1, total, current - 1, current, current + 1]);
    const sorted = Array.from(set).filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
    const out: (number | "ellipsis")[] = [];
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i]! - sorted[i - 1]! > 1) out.push("ellipsis");
      out.push(sorted[i]!);
    }
    return out;
  };

  // Get language for translations
  const language = getStoredLanguage();

  return (
    <div className="w-full overflow-x-hidden max-w-full">
      {/* Category Navigation - Full Width */}
      <CategoryNavigation />
      
      {/* Products Header - With Container */}
      <div className={PAGE_CONTAINER}>
        <ProductsHeader
          total={productsData.meta.total}
          perPage={productsData.meta.limit}
        />
      </div>

      <div className="max-w-7xl mx-auto pl-2 sm:pl-4 md:pl-6 lg:pl-8 pr-4 sm:pr-6 lg:pr-8 flex flex-col lg:flex-row gap-8">
        <ProductsFiltersProvider
          category={params?.category}
          search={params?.search}
          minPrice={params?.minPrice}
          maxPrice={params?.maxPrice}
        >
        <aside className="w-64 hidden lg:block bg-gray-50 rounded-xl flex-shrink-0">
          <div className="sticky top-4 p-4 space-y-6">
            <Suspense fallback={<div>{t(language, 'common.messages.loadingFilters')}</div>}>
              <PriceFilter currentMinPrice={params?.minPrice} currentMaxPrice={params?.maxPrice} category={params?.category} search={params?.search} />
              <ColorFilter category={params?.category} search={params?.search} minPrice={params?.minPrice} maxPrice={params?.maxPrice} selectedColors={selectedColors} />
              <SizeFilter category={params?.category} search={params?.search} minPrice={params?.minPrice} maxPrice={params?.maxPrice} selectedSizes={selectedSizes} />
              <BrandFilter category={params?.category} search={params?.search} minPrice={params?.minPrice} maxPrice={params?.maxPrice} selectedBrands={selectedBrands} />
            </Suspense>
          </div>
        </aside>

        <div className="flex-1 min-w-0 w-full lg:w-auto py-4 overflow-x-hidden">

          {normalizedProducts.length > 0 ? (
            <>
              <ProductsGrid products={normalizedProducts} sortBy={params?.sort || "default"} />

              {productsData.meta.totalPages > 1 && (
                <nav
                  className="mt-10 flex flex-wrap items-center justify-center gap-2"
                  aria-label="Pagination"
                >
                  {page > 1 ? (
                    <Link href={buildPaginationUrl(page - 1)}>
                      <Button
                        variant="outline"
                        className="min-w-[90px] rounded-lg border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm transition hover:border-neutral-400 hover:bg-neutral-50"
                      >
                        {t(language, 'common.pagination.previous')}
                      </Button>
                    </Link>
                  ) : (
                    <span className="min-w-[90px] rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2 text-center text-sm font-medium text-neutral-400">
                      {t(language, 'common.pagination.previous')}
                    </span>
                  )}

                  <div className="flex items-center gap-1">
                    {getPaginationPages().map((item, idx) =>
                      item === "ellipsis" ? (
                        <span key={`ellipsis-${idx}`} className="px-2 text-neutral-400" aria-hidden>
                          …
                        </span>
                      ) : (
                        <span key={item}>
                          {item === page ? (
                            <span
                              className="flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg bg-neutral-800 px-3 py-1.5 text-sm font-semibold text-white shadow-sm"
                              aria-current="page"
                            >
                              {item}
                            </span>
                          ) : (
                            <Link
                              href={buildPaginationUrl(item)}
                              className="flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 shadow-sm transition hover:border-neutral-400 hover:bg-neutral-50"
                            >
                              {item}
                            </Link>
                          )}
                        </span>
                      )
                    )}
                  </div>

                  {page < productsData.meta.totalPages ? (
                    <Link href={buildPaginationUrl(page + 1)}>
                      <Button
                        variant="outline"
                        className="min-w-[90px] rounded-lg border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm transition hover:border-neutral-400 hover:bg-neutral-50"
                      >
                        {t(language, 'common.pagination.next')}
                      </Button>
                    </Link>
                  ) : (
                    <span className="min-w-[90px] rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2 text-center text-sm font-medium text-neutral-400">
                      {t(language, 'common.pagination.next')}
                    </span>
                  )}
                </nav>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">{t(language, 'common.messages.noProductsFound')}</p>
            </div>
          )}

        </div>

      {/* Mobile Filters Drawer */}
      <MobileFiltersDrawer openEventName={MOBILE_FILTERS_EVENT}>
        <div className="p-4 space-y-6">
          <Suspense fallback={<div>{t(language, 'common.messages.loadingFilters')}</div>}>
            <PriceFilter currentMinPrice={params?.minPrice} currentMaxPrice={params?.maxPrice} category={params?.category} search={params?.search} />
            <ColorFilter category={params?.category} search={params?.search} minPrice={params?.minPrice} maxPrice={params?.maxPrice} selectedColors={selectedColors} />
            <SizeFilter category={params?.category} search={params?.search} minPrice={params?.minPrice} maxPrice={params?.maxPrice} selectedSizes={selectedSizes} />
            <BrandFilter category={params?.category} search={params?.search} minPrice={params?.minPrice} maxPrice={params?.maxPrice} selectedBrands={selectedBrands} />
          </Suspense>
        </div>
      </MobileFiltersDrawer>
        </ProductsFiltersProvider>
      </div>
    </div>
  );
}


