'use client';

import { Card, Button, Input } from '@shop/ui';
import { useTranslation } from '../../../../lib/i18n-client';

interface AdminCategory {
  id: string;
  title: string;
  parentId: string | null;
}

interface CategoryDiscountsCardProps {
  categories: AdminCategory[];
  categoriesLoading: boolean;
  categoryDiscounts: Record<string, number>;
  updateCategoryDiscountValue: (categoryId: string, value: string) => void;
  clearCategoryDiscount: (categoryId: string) => void;
  handleCategoryDiscountSave: () => void;
  categorySaving: boolean;
}

export function CategoryDiscountsCard({
  categories,
  categoriesLoading,
  categoryDiscounts,
  updateCategoryDiscountValue,
  clearCategoryDiscount,
  handleCategoryDiscountSave,
  categorySaving,
}: CategoryDiscountsCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="p-6 mb-8 bg-white border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{t('admin.quickSettings.categoryDiscounts')}</h2>
          <p className="text-sm text-gray-600">{t('admin.quickSettings.categoryDiscountsSubtitle')}</p>
        </div>
        <Button
          variant="primary"
          onClick={handleCategoryDiscountSave}
          disabled={categorySaving || categories.length === 0}
        >
          {categorySaving ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>{t('admin.quickSettings.saving')}</span>
            </div>
          ) : (
            t('admin.quickSettings.save')
          )}
        </Button>
      </div>

      {categoriesLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('admin.quickSettings.loadingCategories')}</p>
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-6 text-gray-600 border border-dashed border-gray-200 rounded">
          {t('admin.quickSettings.noCategories')}
        </div>
      ) : (
        <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-lg">
          {categories.map((category) => {
            const currentValue = categoryDiscounts[category.id];
            return (
              <div
                key={category.id}
                className="flex items-center gap-4 px-4 py-3 bg-white hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {category.title || t('admin.quickSettings.untitledCategory')}
                  </p>
                  {category.parentId ? (
                    <p className="text-xs text-gray-500">{t('admin.quickSettings.parentCategoryId').replace('{id}', category.parentId)}</p>
                  ) : (
                    <p className="text-xs text-gray-500">{t('admin.quickSettings.rootCategory')}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={currentValue === undefined ? '' : currentValue}
                    onChange={(e) => updateCategoryDiscountValue(category.id, e.target.value)}
                    className="w-24"
                    placeholder="0"
                  />
                  <span className="text-sm font-medium text-gray-700">%</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearCategoryDiscount(category.id)}
                    disabled={currentValue === undefined}
                  >
                    {t('admin.quickSettings.clear')}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

