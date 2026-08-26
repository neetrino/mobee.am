import { Suspense } from 'react';
import { DEFAULT_LANGUAGE } from '../../lib/language';
import { ShopCatalogSection } from '@/components/shop/ShopCatalogSection';
import { ShopFiltersShell } from '@/components/shop/ShopFiltersShell';
import { ShopDesktopFiltersAside } from '@/components/shop/ShopDesktopFiltersAside';
import { ShopMobileFiltersDrawer } from '@/components/shop/ShopMobileFiltersDrawer';
import { SITE_CONTENT_GUTTERS_CLASS } from '@/components/header-strip-layout';
import { SHOP_PAGE_FOOTER_GAP_CLASS } from './shop-layout.constants';
import { ShopFiltersAsideFallback, ShopCatalogFallback } from './shop-page-fallbacks';

interface ProductsPageProps {
  searchParams?: Promise<Record<string, string | undefined>>;
}

export const revalidate = 300;

/** Shop shell + filters render while the catalog section streams server-fetched list data (shared cache with the products API). */
export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = searchParams ? await searchParams : {};
  const language = DEFAULT_LANGUAGE;

  const colors = params?.colors;
  const brands = params?.brand;
  const selectedColors = colors ? colors.split(',').map((c: string) => c.trim().toLowerCase()) : [];
  const selectedBrands = brands ? brands.split(',').map((b: string) => b.trim()) : [];
  const categoryParam = params?.category;
  const selectedCategories = categoryParam
    ? categoryParam.split(',').map((c: string) => c.trim()).filter(Boolean)
    : [];

  const filterProps = {
    currentMinPrice: params?.minPrice,
    currentMaxPrice: params?.maxPrice,
    category: params?.category,
    search: params?.search,
    selectedCategories,
    selectedBrands,
    selectedColors,
  };

  return (
    <div className={`w-full max-w-full ${SHOP_PAGE_FOOTER_GAP_CLASS}`}>
      <div
        className={`flex w-full flex-col gap-4 pt-2 lg:min-h-0 lg:flex-row lg:items-start lg:gap-6 lg:pt-4 ${SITE_CONTENT_GUTTERS_CLASS}`}
      >
        <Suspense fallback={<ShopFiltersAsideFallback />}>
          <ShopFiltersShell language={language} searchParams={params}>
            <ShopDesktopFiltersAside {...filterProps} />

            <ShopMobileFiltersDrawer {...filterProps} />
          </ShopFiltersShell>
        </Suspense>

        <Suspense fallback={<ShopCatalogFallback />}>
          <ShopCatalogSection searchParams={params} />
        </Suspense>
      </div>
    </div>
  );
}
