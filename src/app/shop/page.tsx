import { Suspense, type CSSProperties } from 'react';
import { cookies } from 'next/headers';
import { readLanguageFromCookies } from '../../lib/language';
import { t } from '../../lib/i18n';
import { PriceFilter } from '../../components/PriceFilter';
import { ColorFilter } from '../../components/ColorFilter';
import { BrandFilter } from '../../components/BrandFilter';
import { CategoryFilter } from '../../components/CategoryFilter';
import { MobileFiltersDrawer } from '../../components/MobileFiltersDrawer';
import { ProductsFiltersProvider } from '../../components/ProductsFiltersProvider';
import { MOBILE_FILTERS_EVENT } from '../../lib/events';
import { ShopCatalogSection } from '@/components/shop/ShopCatalogSection';
import { SITE_CONTENT_GUTTERS_CLASS } from '@/components/header-strip-layout';
import { SHOP_FILTER_SIDEBAR_WIDTH_CSS } from './shop-layout.constants';

interface ProductsPageProps {
  searchParams?: Promise<Record<string, string | undefined>>;
}

function ShopCatalogFallback() {
  return (
    <div className="min-w-0 w-full flex-1 py-4">
      <div className="mb-6 h-8 w-48 animate-pulse rounded bg-gray-200" />
      <div className="mb-6 h-10 w-full max-w-md animate-pulse rounded bg-gray-200" />
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-5 lg:grid-cols-2 lg:gap-5 xl:grid-cols-3 xl:gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-[3/4] animate-pulse rounded-lg bg-gray-200" aria-hidden />
        ))}
      </div>
    </div>
  );
}

/** Shop shell + filters render while the catalog section streams server-fetched list data (shared cache with the products API). */
export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = searchParams ? await searchParams : {};
  const cookieStore = await cookies();
  const language = readLanguageFromCookies(cookieStore);

  const colors = params?.colors;
  const brands = params?.brand;
  const selectedColors = colors ? colors.split(',').map((c: string) => c.trim().toLowerCase()) : [];
  const selectedBrands = brands ? brands.split(',').map((b: string) => b.trim()) : [];

  return (
    <div className="w-full max-w-full">
      <div
        className={`flex w-full flex-col gap-6 pt-4 lg:flex-row lg:items-start ${SITE_CONTENT_GUTTERS_CLASS}`}
      >
        <ProductsFiltersProvider
          category={params?.category}
          search={params?.search}
          minPrice={params?.minPrice}
          maxPrice={params?.maxPrice}
        >
          <aside
            className="hidden lg:block lg:w-[var(--shop-filter-aside-width)] lg:flex-shrink-0 lg:self-start lg:sticky lg:top-[4.25rem] lg:border-r lg:border-[#e7e7e7] lg:pr-0"
            style={
              {
                ['--shop-filter-aside-width']: SHOP_FILTER_SIDEBAR_WIDTH_CSS,
              } as CSSProperties
            }
          >
            <div className="bg-white px-6 pt-6">
              <div className="mb-6">
                <h2 className="text-base font-semibold leading-6 tracking-[-0.02em] text-[#0F172B]">
                  {t(language, 'products.filters.sidebar.title')}
                </h2>
                <p className="mt-1 text-sm leading-5 tracking-[-0.01em] text-[#62748E]">
                  {t(language, 'products.filters.sidebar.subtitle')}
                </p>
              </div>
              <PriceFilter
                currentMinPrice={params?.minPrice}
                currentMaxPrice={params?.maxPrice}
                category={params?.category}
                search={params?.search}
              />
              <CategoryFilter
                currentCategory={params?.category}
                search={params?.search}
                minPrice={params?.minPrice}
                maxPrice={params?.maxPrice}
              />
              <BrandFilter
                category={params?.category}
                search={params?.search}
                minPrice={params?.minPrice}
                maxPrice={params?.maxPrice}
                selectedBrands={selectedBrands}
              />
              <ColorFilter
                category={params?.category}
                search={params?.search}
                minPrice={params?.minPrice}
                maxPrice={params?.maxPrice}
                selectedColors={selectedColors}
              />
            </div>
          </aside>

          <Suspense fallback={<ShopCatalogFallback />}>
            <ShopCatalogSection searchParams={params} />
          </Suspense>

          <MobileFiltersDrawer openEventName={MOBILE_FILTERS_EVENT}>
            <div className="space-y-6 p-4">
              <PriceFilter
                currentMinPrice={params?.minPrice}
                currentMaxPrice={params?.maxPrice}
                category={params?.category}
                search={params?.search}
              />
              <CategoryFilter
                currentCategory={params?.category}
                search={params?.search}
                minPrice={params?.minPrice}
                maxPrice={params?.maxPrice}
              />
              <BrandFilter
                category={params?.category}
                search={params?.search}
                minPrice={params?.minPrice}
                maxPrice={params?.maxPrice}
                selectedBrands={selectedBrands}
              />
              <ColorFilter
                category={params?.category}
                search={params?.search}
                minPrice={params?.minPrice}
                maxPrice={params?.maxPrice}
                selectedColors={selectedColors}
              />
            </div>
          </MobileFiltersDrawer>
        </ProductsFiltersProvider>
      </div>
    </div>
  );
}
