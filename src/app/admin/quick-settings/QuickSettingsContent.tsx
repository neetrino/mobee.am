'use client';

import { Card } from '@/app/admin/lib/adminShopUi';
import { useRouter } from 'next/navigation';
import { useTranslation } from '../../../lib/i18n-client';
import { AdminPageShell } from '../components/AdminPageShell';
import { GlobalDiscountCard } from './components/GlobalDiscountCard';
import { QuickInfoCard } from './components/QuickInfoCard';
import { CategoryDiscountsCard } from './components/CategoryDiscountsCard';
import { BrandDiscountsCard } from './components/BrandDiscountsCard';
import { ProductDiscountsCard } from './components/ProductDiscountsCard';

interface AdminCategory {
  id: string;
  title: string;
  parentId: string | null;
}

interface AdminBrand {
  id: string;
  name: string;
  logoUrl?: string;
}

interface AdminProductsListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface QuickSettingsContentProps {
  currentPath: string;
  router: ReturnType<typeof useRouter>;
  t: ReturnType<typeof useTranslation>['t'];
  globalDiscount: number;
  setGlobalDiscount: (value: number) => void;
  discountLoading: boolean;
  discountSaving: boolean;
  handleDiscountSave: () => void;
  categories: AdminCategory[];
  categoriesLoading: boolean;
  categoryDiscounts: Record<string, number>;
  updateCategoryDiscountValue: (categoryId: string, value: string) => void;
  clearCategoryDiscount: (categoryId: string) => void;
  handleCategoryDiscountSave: () => void;
  categorySaving: boolean;
  brands: AdminBrand[];
  brandsLoading: boolean;
  brandDiscounts: Record<string, number>;
  updateBrandDiscountValue: (brandId: string, value: string) => void;
  clearBrandDiscount: (brandId: string) => void;
  handleBrandDiscountSave: () => void;
  brandSaving: boolean;
  products: any[];
  productsMeta: AdminProductsListMeta | null;
  onProductsPageChange: (page: number) => void;
  productsSearchValue: string;
  onProductsSearchChange: (value: string) => void;
  productsSearchApplied: string;
  productsLoading: boolean;
  productDiscounts: Record<string, number>;
  setProductDiscounts: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  handleProductDiscountSave: (productId: string) => void;
  savingProductId: string | null;
}

export function QuickSettingsContent({
  currentPath,
  router,
  t,
  globalDiscount,
  setGlobalDiscount,
  discountLoading,
  discountSaving,
  handleDiscountSave,
  categories,
  categoriesLoading,
  categoryDiscounts,
  updateCategoryDiscountValue,
  clearCategoryDiscount,
  handleCategoryDiscountSave,
  categorySaving,
  brands,
  brandsLoading,
  brandDiscounts,
  updateBrandDiscountValue,
  clearBrandDiscount,
  handleBrandDiscountSave,
  brandSaving,
  products,
  productsMeta,
  onProductsPageChange,
  productsSearchValue,
  onProductsSearchChange,
  productsSearchApplied,
  productsLoading,
  productDiscounts,
  setProductDiscounts,
  handleProductDiscountSave,
  savingProductId,
}: QuickSettingsContentProps) {
  return (
    <AdminPageShell currentPath={currentPath} router={router} t={t}>
      <div className="max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('admin.quickSettings.title')}</h1>
          <p className="text-gray-600 mt-2">{t('admin.quickSettings.subtitle')}</p>
        </div>
        {/* Quick Settings - Discount Management */}
        <Card className="p-6 mb-8 bg-white border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{t('admin.quickSettings.quickSettingsTitle')}</h2>
              <p className="text-sm text-gray-600 mt-1">{t('admin.quickSettings.quickSettingsSubtitle')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlobalDiscountCard
              globalDiscount={globalDiscount}
              setGlobalDiscount={setGlobalDiscount}
              discountLoading={discountLoading}
              discountSaving={discountSaving}
              handleDiscountSave={handleDiscountSave}
            />

            <QuickInfoCard />
          </div>
        </Card>

        <CategoryDiscountsCard
          categories={categories}
          categoriesLoading={categoriesLoading}
          categoryDiscounts={categoryDiscounts}
          updateCategoryDiscountValue={updateCategoryDiscountValue}
          clearCategoryDiscount={clearCategoryDiscount}
          handleCategoryDiscountSave={handleCategoryDiscountSave}
          categorySaving={categorySaving}
        />

        <BrandDiscountsCard
          brands={brands}
          brandsLoading={brandsLoading}
          brandDiscounts={brandDiscounts}
          updateBrandDiscountValue={updateBrandDiscountValue}
          clearBrandDiscount={clearBrandDiscount}
          handleBrandDiscountSave={handleBrandDiscountSave}
          brandSaving={brandSaving}
        />

        <ProductDiscountsCard
          products={products}
          productsMeta={productsMeta}
          onProductsPageChange={onProductsPageChange}
          searchValue={productsSearchValue}
          onSearchChange={onProductsSearchChange}
          searchApplied={productsSearchApplied}
          productsLoading={productsLoading}
          productDiscounts={productDiscounts}
          setProductDiscounts={setProductDiscounts}
          handleProductDiscountSave={handleProductDiscountSave}
          savingProductId={savingProductId}
        />
      </div>
    </AdminPageShell>
  );
}
