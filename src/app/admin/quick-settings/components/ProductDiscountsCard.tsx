'use client';

import { Card, Button, Input } from '@/app/admin/lib/adminShopUi';
import { useTranslation } from '../../../../lib/i18n-client';
import { ProductDiscountsPagination } from './ProductDiscountsPagination';

interface Product {
  id: string;
  title: string;
  image?: string;
  price?: number;
  discountPercent?: number;
}

interface ProductDiscountsListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ProductDiscountsCardProps {
  products: Product[];
  productsMeta: ProductDiscountsListMeta | null;
  onProductsPageChange: (page: number) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchApplied: string;
  productsLoading: boolean;
  productDiscounts: Record<string, number>;
  setProductDiscounts: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  handleProductDiscountSave: (productId: string) => void;
  savingProductId: string | null;
}

export function ProductDiscountsCard({
  products,
  productsMeta,
  onProductsPageChange,
  searchValue,
  onSearchChange,
  searchApplied,
  productsLoading,
  productDiscounts,
  setProductDiscounts,
  handleProductDiscountSave,
  savingProductId,
}: ProductDiscountsCardProps) {
  const { t } = useTranslation();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const hasSearchFilter = searchApplied.trim().length > 0;

  return (
    <Card className="p-6 bg-white border-gray-200">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('admin.quickSettings.productDiscounts')}</h2>
        <p className="text-sm text-gray-600">{t('admin.quickSettings.productDiscountsSubtitle')}</p>
      </div>

      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="sr-only" htmlFor="product-discounts-search">
          {t('admin.quickSettings.productDiscountsSearchLabel')}
        </label>
        <Input
          id="product-discounts-search"
          type="search"
          role="searchbox"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('admin.quickSettings.productDiscountsSearchPlaceholder')}
          className="w-full sm:max-w-md"
          autoComplete="off"
        />
        {searchValue.trim().length > 0 ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => onSearchChange('')}>
            {t('admin.quickSettings.productDiscountsClearSearch')}
          </Button>
        ) : null}
      </div>

      {productsLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-admin mx-auto mb-4"></div>
          <p className="text-gray-600">{t('admin.quickSettings.loadingProducts')}</p>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">
            {hasSearchFilter
              ? t('admin.quickSettings.productDiscountsNoSearchResults')
              : t('admin.quickSettings.noProducts')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {products.map((product) => {
            const currentDiscount = Number(productDiscounts[product.id] ?? product.discountPercent ?? 0);
            const originalPrice = product.price || 0;
            const discountedPrice = currentDiscount > 0 && originalPrice > 0
              ? Math.round(originalPrice * (1 - currentDiscount / 100))
              : originalPrice;

            return (
              <div
                key={product.id}
                className="flex items-center gap-4 p-4 border-2 border-admin-300 rounded-supersudo hover:bg-admin-50 transition-colors bg-admin-50/30"
              >
                {product.image && (
                  <div className="flex-shrink-0">
                    <img
                      src={product.image}
                      alt={product.title}
                      className="w-16 h-16 object-cover rounded-supersudo"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 truncate">{product.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {currentDiscount > 0 && originalPrice > 0 ? (
                      <>
                        <span className="text-xs font-semibold text-admin-600 select-none">
                          {formatPrice(discountedPrice)}
                        </span>
                        <span className="text-xs text-gray-400 line-through select-none">
                          {formatPrice(originalPrice)}
                        </span>
                        <span className="text-xs text-red-600 font-medium">
                          -{currentDiscount}%
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-gray-500 select-none">
                        {originalPrice > 0 ? formatPrice(originalPrice) : 'N/A'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={productDiscounts[product.id] ?? product.discountPercent ?? 0}
                    onChange={(e) => {
                      const value = e.target.value;
                      const discountValue = value === '' ? 0 : parseFloat(value) || 0;
                      console.log(`🔄 [QUICK SETTINGS] Updating discount for product ${product.id}: ${discountValue}%`);
                      setProductDiscounts((prev) => {
                        const updated = {
                          ...prev,
                          [product.id]: discountValue,
                        };
                        console.log(`✅ [QUICK SETTINGS] Updated productDiscounts:`, updated);
                        return updated;
                      });
                    }}
                    className="w-20"
                    placeholder="0"
                  />
                  <span className="text-sm font-medium text-gray-700 w-6">%</span>
                  <Button
                    variant="admin"
                    size="sm"
                    onClick={() => handleProductDiscountSave(product.id)}
                    disabled={savingProductId === product.id}
                    className="px-4"
                  >
                    {savingProductId === product.id ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      </div>
                    ) : (
                      t('admin.quickSettings.save')
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
          {productsMeta && productsMeta.totalPages > 1 ? (
            <ProductDiscountsPagination
              page={productsMeta.page}
              totalPages={productsMeta.totalPages}
              onPageChange={onProductsPageChange}
            />
          ) : null}
        </div>
      )}
    </Card>
  );
}

