import Link from 'next/link';
import { Suspense } from 'react';
import { getStoredLanguage } from '../../lib/language';
import { t } from '../../lib/i18n';
import { PriceFilter } from '../../components/PriceFilter';
import { ColorFilter } from '../../components/ColorFilter';
import { BrandFilter } from '../../components/BrandFilter';
import { CategoryFilter } from '../../components/CategoryFilter';
import { ProductsHeader } from '../../components/ProductsHeader';
import { ProductsGrid } from '../../components/ProductsGrid';
import { MobileFiltersDrawer } from '../../components/MobileFiltersDrawer';
import { ProductsFiltersProvider } from '../../components/ProductsFiltersProvider';
import { ShopSortFilter } from '../../components/ShopSortFilter';
import { MOBILE_FILTERS_EVENT } from '../../lib/events';
import { parseProductSortOption, type ProductSortOption } from '@/lib/products/sort';

const PAGE_CONTAINER = 'mx-auto w-full max-w-[1917px] px-4 sm:px-6 lg:px-[53px]';
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
  sort: ProductSortOption = "default",
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
    if (sort !== "default") params.sort = sort;

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
interface ProductsPageProps {
  searchParams?: Promise<Record<string, string | undefined>> | Record<string, string | undefined>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = searchParams ? await searchParams : {};
  const page = parseInt(params?.page || "1", 10);
  const limitParam = params?.limit?.toString().trim();
  const parsedLimit = limitParam && !Number.isNaN(parseInt(limitParam, 10))
    ? parseInt(limitParam, 10)
    : null;
  const perPage = parsedLimit ? Math.min(parsedLimit, 200) : 12;

  const sort = parseProductSortOption(params?.sort);

  const productsData = await getProducts(
    page,
    params?.search,
    params?.category,
    params?.minPrice,
    params?.maxPrice,
    params?.colors,
    params?.sizes,
    params?.brand,
    sort,
    perPage
  );

  // ------------------------------------
  // 🔧 FIX: normalize products 
  // add missing inStock, missing image fields 
  // ------------------------------------
  const normalizedProducts = productsData.data.map((p: Product & {
    defaultVariantId?: string | null;
    colors?: string[];
  }) => ({
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
  const brands = params?.brand;
  const selectedColors = colors ? colors.split(',').map((c: string) => c.trim().toLowerCase()) : [];
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
    return `/shop?${q.toString()}`;
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
    <div className="w-full max-w-full">
      {/* Products Header - With Container */}
      <div className={PAGE_CONTAINER}>
        <ProductsHeader
          total={productsData.meta.total}
        />
      </div>

      <div className="mx-auto flex w-full max-w-[1917px] flex-col gap-6 px-4 sm:px-6 lg:flex-row lg:items-start lg:px-[53px]">
        <ProductsFiltersProvider
          category={params?.category}
          search={params?.search}
          minPrice={params?.minPrice}
          maxPrice={params?.maxPrice}
        >
        <aside className="hidden lg:block lg:w-[403px] lg:flex-shrink-0 lg:self-start lg:sticky lg:top-6 lg:border-r lg:border-[#e7e7e7] lg:pr-0">
          <div className="bg-white px-6 pt-6">
            <div className="mb-6">
              <h2 className="text-base font-semibold leading-6 tracking-[-0.02em] text-[#0F172B]">
                {t(language, 'products.filters.sidebar.title')}
              </h2>
              <p className="mt-1 text-sm leading-5 tracking-[-0.01em] text-[#62748E]">
                {t(language, 'products.filters.sidebar.subtitle')}
              </p>
            </div>
            <Suspense fallback={<div>{t(language, 'common.messages.loadingFilters')}</div>}>
              <PriceFilter currentMinPrice={params?.minPrice} currentMaxPrice={params?.maxPrice} category={params?.category} search={params?.search} />
              <CategoryFilter currentCategory={params?.category} search={params?.search} minPrice={params?.minPrice} maxPrice={params?.maxPrice} />
              <BrandFilter category={params?.category} search={params?.search} minPrice={params?.minPrice} maxPrice={params?.maxPrice} selectedBrands={selectedBrands} />
              <ColorFilter category={params?.category} search={params?.search} minPrice={params?.minPrice} maxPrice={params?.maxPrice} selectedColors={selectedColors} />
            </Suspense>
          </div>
        </aside>

        <div className="min-w-0 flex-1 w-full py-4 lg:pl-[53px]">
          <nav className="mb-4 flex items-center text-sm" aria-label="Breadcrumb">
            <Link href="/" className="text-gray-500 transition-colors hover:text-gray-700">
              {t(language, 'common.navigation.home')}
            </Link>
            <span className="mx-2 text-gray-400">/</span>
            <span className="font-semibold text-gray-900">{t(language, 'common.navigation.products')}</span>
          </nav>
          <div className="mb-6 pt-2">
            <ShopSortFilter />
          </div>

          {normalizedProducts.length > 0 ? (
            <>
              <ProductsGrid products={normalizedProducts} sortBy={sort} />

              {productsData.meta.totalPages > 1 && (
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
                        {t(language, 'common.pagination.previous')}
                      </Link>
                    ) : (
                      <span className="inline-flex h-10 items-center justify-center rounded-[9999px] border border-transparent px-4 text-sm font-medium text-[#9AA4B2]">
                        {t(language, 'common.pagination.previous')}
                      </span>
                    )}

                    <div className="mx-1 h-6 w-px bg-[#E2E8F0]" aria-hidden />

                    {getPaginationPages().map((item, idx) =>
                      item === "ellipsis" ? (
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
                      )
                    )}

                    <div className="mx-1 h-6 w-px bg-[#E2E8F0]" aria-hidden />

                    {page < productsData.meta.totalPages ? (
                      <Link
                        href={buildPaginationUrl(page + 1)}
                        className="inline-flex h-10 items-center justify-center rounded-[9999px] border border-transparent px-4 text-sm font-medium text-[#0F172B] transition-colors hover:border-[#d8dbe1] hover:bg-[#f6f7f9]"
                      >
                        {t(language, 'common.pagination.next')}
                      </Link>
                    ) : (
                      <span className="inline-flex h-10 items-center justify-center rounded-[9999px] border border-transparent px-4 text-sm font-medium text-[#9AA4B2]">
                        {t(language, 'common.pagination.next')}
                      </span>
                    )}
                  </div>
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
            <CategoryFilter currentCategory={params?.category} search={params?.search} minPrice={params?.minPrice} maxPrice={params?.maxPrice} />
            <BrandFilter category={params?.category} search={params?.search} minPrice={params?.minPrice} maxPrice={params?.maxPrice} selectedBrands={selectedBrands} />
            <ColorFilter category={params?.category} search={params?.search} minPrice={params?.minPrice} maxPrice={params?.maxPrice} selectedColors={selectedColors} />
          </Suspense>
        </div>
      </MobileFiltersDrawer>
        </ProductsFiltersProvider>
      </div>
    </div>
  );
}


