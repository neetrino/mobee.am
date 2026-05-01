'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../../lib/auth/AuthContext';
import { apiClient } from '../../../lib/api-client';
import { useTranslation } from '../../../lib/i18n-client';
import { QuickSettingsContent } from './QuickSettingsContent';

interface AdminSettingsResponse {
  globalDiscount: number;
  categoryDiscounts?: Record<string, number>;
  brandDiscounts?: Record<string, number>;
}

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

export default function QuickSettingsPage() {
  const { t } = useTranslation();
  const { isLoggedIn, isAdmin, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);
  const [discountLoading, setDiscountLoading] = useState(false);
  const [discountSaving, setDiscountSaving] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productDiscounts, setProductDiscounts] = useState<Record<string, number>>({});
  const [savingProductId, setSavingProductId] = useState<string | null>(null);
  const [categoryDiscounts, setCategoryDiscounts] = useState<Record<string, number>>({});
  const [brandDiscounts, setBrandDiscounts] = useState<Record<string, number>>({});
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [brands, setBrands] = useState<AdminBrand[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [categorySaving, setCategorySaving] = useState(false);
  const [brandSaving, setBrandSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      console.log('⚙️ [QUICK SETTINGS] Fetching settings...');
      setDiscountLoading(true);
      const settings = await apiClient.get<AdminSettingsResponse>('/api/v1/admin/settings');
      setGlobalDiscount(settings.globalDiscount || 0);
      setCategoryDiscounts(settings.categoryDiscounts || {});
      setBrandDiscounts(settings.brandDiscounts || {});
      console.log('✅ [QUICK SETTINGS] Settings loaded:', settings);
    } catch (err: any) {
      console.error('❌ [QUICK SETTINGS] Error fetching settings:', err);
      setGlobalDiscount(0);
    } finally {
      setDiscountLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      console.log('📦 [QUICK SETTINGS] Fetching products...');
      setProductsLoading(true);
      
      // Սկզբում բեռնում ենք առաջին էջը limit=100-ով (առավելագույն արժեք)
      const firstPageResponse = await apiClient.get<{ 
        data: any[]; 
        meta?: { totalPages: number; total: number } 
      }>('/api/v1/admin/products', {
        params: { page: '1', limit: '100' },
      });
      
      let allProducts: any[] = [];
      
      if (firstPageResponse?.data && Array.isArray(firstPageResponse.data)) {
        allProducts = [...firstPageResponse.data];
        console.log('📦 [QUICK SETTINGS] First page loaded:', firstPageResponse.data.length);
        
        // Եթե կան ավելի շատ էջեր, բեռնում ենք մնացածները
        const totalPages = firstPageResponse.meta?.totalPages || 1;
        if (totalPages > 1) {
          console.log(`📦 [QUICK SETTINGS] Loading ${totalPages - 1} more pages...`);
          
          // Ստեղծում ենք բոլոր էջերի հարցումները
          const pagePromises: Promise<{ data: any[] }>[] = [];
          for (let page = 2; page <= totalPages; page++) {
            pagePromises.push(
              apiClient.get<{ data: any[] }>('/api/v1/admin/products', {
                params: { page: page.toString(), limit: '100' },
              })
            );
          }
          
          // Բեռնում ենք բոլոր էջերը զուգահեռ
          const remainingPages = await Promise.all(pagePromises);
          remainingPages.forEach((pageResponse, index) => {
            if (pageResponse?.data && Array.isArray(pageResponse.data)) {
              allProducts = [...allProducts, ...pageResponse.data];
              console.log(`📦 [QUICK SETTINGS] Page ${index + 2} loaded:`, pageResponse.data.length);
            }
          });
        }
        
        // Սահմանում ենք բոլոր ապրանքները
        setProducts(allProducts);
        
        // Նախաձեռնում ենք ապրանքների զեղչերը API տվյալներից
        const discounts: Record<string, number> = {};
        allProducts.forEach((product: any) => {
          discounts[product.id] = product.discountPercent || 0;
        });
        setProductDiscounts(discounts);
        
        console.log('✅ [QUICK SETTINGS] All products loaded:', allProducts.length);
      } else {
        setProducts([]);
        console.warn('⚠️ [QUICK SETTINGS] No products data received');
      }
    } catch (err: any) {
      console.error('❌ [QUICK SETTINGS] Error fetching products:', err);
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      console.log('📂 [QUICK SETTINGS] Fetching categories...');
      setCategoriesLoading(true);
      const response = await apiClient.get<{ data: AdminCategory[] }>('/api/v1/admin/categories');
      if (response?.data && Array.isArray(response.data)) {
        setCategories(response.data);
        console.log('✅ [QUICK SETTINGS] Categories loaded:', response.data.length);
      } else {
        setCategories([]);
      }
    } catch (err: any) {
      console.error('❌ [QUICK SETTINGS] Error fetching categories:', err);
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  const fetchBrands = useCallback(async () => {
    try {
      console.log('🏷️ [QUICK SETTINGS] Fetching brands...');
      setBrandsLoading(true);
      const response = await apiClient.get<{ data: AdminBrand[] }>('/api/v1/admin/brands');
      if (response?.data && Array.isArray(response.data)) {
        setBrands(response.data);
        console.log('✅ [QUICK SETTINGS] Brands loaded:', response.data.length);
      } else {
        setBrands([]);
      }
    } catch (err: any) {
      console.error('❌ [QUICK SETTINGS] Error fetching brands:', err);
      setBrands([]);
    } finally {
      setBrandsLoading(false);
    }
  }, []);

  const clampDiscountValue = (value: number) => {
    if (isNaN(value)) {
      return 0;
    }
    return Math.min(100, Math.max(0, Math.round(value * 100) / 100));
  };

  const updateCategoryDiscountValue = (categoryId: string, value: string) => {
    if (value === '') {
      setCategoryDiscounts((prev) => {
        const updated = { ...prev };
        delete updated[categoryId];
        return updated;
      });
      return;
    }
    const numericValue = clampDiscountValue(parseFloat(value));
    setCategoryDiscounts((prev) => ({
      ...prev,
      [categoryId]: numericValue,
    }));
  };

  const updateBrandDiscountValue = (brandId: string, value: string) => {
    if (value === '') {
      setBrandDiscounts((prev) => {
        const updated = { ...prev };
        delete updated[brandId];
        return updated;
      });
      return;
    }
    const numericValue = clampDiscountValue(parseFloat(value));
    setBrandDiscounts((prev) => ({
      ...prev,
      [brandId]: numericValue,
    }));
  };

  const clearCategoryDiscount = (categoryId: string) => {
    setCategoryDiscounts((prev) => {
      const updated = { ...prev };
      delete updated[categoryId];
      return updated;
    });
  };

  const clearBrandDiscount = (brandId: string) => {
    setBrandDiscounts((prev) => {
      const updated = { ...prev };
      delete updated[brandId];
      return updated;
    });
  };

  const buildDiscountPayload = () => {
    const filterMap = (map: Record<string, number>) =>
      Object.entries(map || {}).reduce<Record<string, number>>((acc, [id, value]) => {
        if (typeof value === 'number' && value > 0) {
          acc[id] = clampDiscountValue(value);
        }
        return acc;
      }, {});

    return {
      categoryDiscounts: filterMap(categoryDiscounts),
      brandDiscounts: filterMap(brandDiscounts),
    };
  };

  const handleDiscountSave = async () => {
    const discountValue = parseFloat(globalDiscount.toString());
    if (isNaN(discountValue) || discountValue < 0 || discountValue > 100) {
      alert(t('admin.quickSettings.discountMustBeValid'));
      return;
    }

    setDiscountSaving(true);
    try {
      console.log('⚙️ [QUICK SETTINGS] Saving global discount...', discountValue);
      await apiClient.put('/api/v1/admin/settings', {
        globalDiscount: discountValue,
        ...buildDiscountPayload(),
      });
      
      // Refresh products to get updated labels with new discount percentage
      await fetchProducts();
      
      alert(t('admin.quickSettings.savedSuccess'));
      console.log('✅ [QUICK SETTINGS] Global discount saved');
    } catch (err: any) {
      console.error('❌ [QUICK SETTINGS] Error saving discount:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to save';
      alert(t('admin.quickSettings.errorSaving').replace('{message}', errorMessage));
    } finally {
      setDiscountSaving(false);
    }
  };

  const handleCategoryDiscountSave = async () => {
    setCategorySaving(true);
    try {
      console.log('⚙️ [QUICK SETTINGS] Saving category discounts...');
      await apiClient.put('/api/v1/admin/settings', {
        globalDiscount,
        ...buildDiscountPayload(),
      });
      await fetchProducts();
      alert(t('admin.quickSettings.savedSuccess'));
      console.log('✅ [QUICK SETTINGS] Category discounts saved');
    } catch (err: any) {
      console.error('❌ [QUICK SETTINGS] Error saving category discounts:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to save';
      alert(t('admin.quickSettings.errorSaving').replace('{message}', errorMessage));
    } finally {
      setCategorySaving(false);
    }
  };

  const handleBrandDiscountSave = async () => {
    setBrandSaving(true);
    try {
      console.log('⚙️ [QUICK SETTINGS] Saving brand discounts...');
      await apiClient.put('/api/v1/admin/settings', {
        globalDiscount,
        ...buildDiscountPayload(),
      });
      await fetchProducts();
      alert(t('admin.quickSettings.savedSuccess'));
      console.log('✅ [QUICK SETTINGS] Brand discounts saved');
    } catch (err: any) {
      console.error('❌ [QUICK SETTINGS] Error saving brand discounts:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to save';
      alert(t('admin.quickSettings.errorSaving').replace('{message}', errorMessage));
    } finally {
      setBrandSaving(false);
    }
  };

  const handleProductDiscountSave = async (productId: string) => {
    const discountValue = productDiscounts[productId] || 0;
    if (isNaN(discountValue) || discountValue < 0 || discountValue > 100) {
      alert(t('admin.quickSettings.discountMustBeValid'));
      return;
    }

    setSavingProductId(productId);
    try {
      console.log('⚙️ [QUICK SETTINGS] Saving product discount only...', productId, discountValue);
      
      // Используем специальный endpoint, который обновляет только discountPercent
      // Это гарантирует, что все остальные поля (media, variants, price и т.д.) останутся без изменений
      const updateData = {
        discountPercent: discountValue,
      };
      
      console.log('📤 [QUICK SETTINGS] Sending update data to discount endpoint:', updateData);
      
      await apiClient.patch(`/api/v1/admin/products/${productId}/discount`, updateData);
      
      // Refresh products to get updated labels with new discount percentage
      await fetchProducts();
      
      alert(t('admin.quickSettings.productDiscountSaved'));
      console.log('✅ [QUICK SETTINGS] Product discount saved');
    } catch (err: any) {
      console.error('❌ [QUICK SETTINGS] Error saving product discount:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to save';
      alert(t('admin.quickSettings.errorSavingProduct').replace('{message}', errorMessage));
    } finally {
      setSavingProductId(null);
    }
  };

  useEffect(() => {
    if (!isLoading && isLoggedIn && isAdmin) {
      fetchSettings();
      fetchProducts();
      fetchCategories();
      fetchBrands();
    }
  }, [isLoading, isLoggedIn, isAdmin, fetchSettings, fetchProducts, fetchCategories, fetchBrands]);

  useEffect(() => {
    if (!isLoading) {
      if (!isLoggedIn) {
        console.log('❌ [QUICK SETTINGS] User not logged in, redirecting to login...');
        router.push('/login');
        return;
      }
      if (!isAdmin) {
        console.log('❌ [QUICK SETTINGS] User is not admin, redirecting to home...');
        router.push('/');
        return;
      }
    }
  }, [isLoggedIn, isAdmin, isLoading, router]);

  if (isLoading) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-admin mx-auto mb-4"></div>
          <p className="text-gray-600">{t('admin.common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn || !isAdmin) {
    return null; // Will redirect
  }

  return (
      <QuickSettingsContent
      currentPath={pathname || '/supersudo/quick-settings'}
      router={router}
      t={t}
      globalDiscount={globalDiscount}
      setGlobalDiscount={setGlobalDiscount}
      discountLoading={discountLoading}
      discountSaving={discountSaving}
      handleDiscountSave={handleDiscountSave}
      categories={categories}
      categoriesLoading={categoriesLoading}
      categoryDiscounts={categoryDiscounts}
      updateCategoryDiscountValue={updateCategoryDiscountValue}
      clearCategoryDiscount={clearCategoryDiscount}
      handleCategoryDiscountSave={handleCategoryDiscountSave}
      categorySaving={categorySaving}
      brands={brands}
      brandsLoading={brandsLoading}
      brandDiscounts={brandDiscounts}
      updateBrandDiscountValue={updateBrandDiscountValue}
      clearBrandDiscount={clearBrandDiscount}
      handleBrandDiscountSave={handleBrandDiscountSave}
      brandSaving={brandSaving}
      products={products}
      productsLoading={productsLoading}
      productDiscounts={productDiscounts}
      setProductDiscounts={setProductDiscounts}
      handleProductDiscountSave={handleProductDiscountSave}
      savingProductId={savingProductId}
    />
  );
}
