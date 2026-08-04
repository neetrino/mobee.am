'use client';

import { useEffect } from 'react';
import { Button, Input } from '@/app/admin/lib/adminShopUi';
import { acquireBodyScrollLock } from '../../../../lib/body-scroll-lock';
import { useTranslation } from '../../../../lib/i18n-client';
import type { Category, CategoryFormData } from '../types';
import { CategoryImageField } from './CategoryImageField';

interface AddCategoryModalProps {
  isOpen: boolean;
  formData: CategoryFormData;
  categories: Category[];
  saving: boolean;
  onClose: () => void;
  onFormDataChange: (data: CategoryFormData) => void;
  onSubmit: () => Promise<void>;
}

export function AddCategoryModal({
  isOpen,
  formData,
  categories,
  saving,
  onClose,
  onFormDataChange,
  onSubmit,
}: AddCategoryModalProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    return acquireBodyScrollLock();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4 sm:p-6">
      <div className="flex min-h-full items-start justify-center">
      <div className="bg-white rounded-supersudo p-6 max-w-md w-full max-h-[calc(100vh-2rem)] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('admin.categories.addCategory')}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.categories.categoryTitle')} *
            </label>
            <Input
              type="text"
              value={formData.title}
              onChange={(e) => onFormDataChange({ ...formData, title: e.target.value })}
              placeholder={t('admin.categories.categoryTitlePlaceholder')}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.categories.categorySlug')}
            </label>
            <Input
              type="text"
              value={formData.slug}
              onChange={(e) => onFormDataChange({ ...formData, slug: e.target.value })}
              placeholder={t('admin.categories.categorySlugPlaceholder')}
              className="w-full"
            />
            <p className="mt-1 text-xs text-gray-500">{t('admin.categories.categorySlugHint')}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.categories.parentCategory')}
            </label>
            <select
              value={formData.parentId}
              onChange={(e) => onFormDataChange({ ...formData, parentId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-supersudo focus:outline-none focus:ring-2 focus:ring-admin"
            >
              <option value="">{t('admin.categories.rootCategory')}</option>
              {categories
                .filter((cat) => !cat.parentId)
                .map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.title}
                  </option>
                ))}
            </select>
          </div>
          <CategoryImageField
            imageUrl={formData.imageUrl}
            onChange={(imageUrl) => onFormDataChange({ ...formData, imageUrl })}
          />
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.requiresSizes}
                onChange={(e) => onFormDataChange({ ...formData, requiresSizes: e.target.checked })}
                className="w-4 h-4 text-admin-600 border-gray-300 rounded-supersudo focus:ring-admin"
              />
              <span className="text-sm text-gray-700">
                {t('admin.categories.requiresSizes')}
              </span>
            </label>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <Button
            variant="admin"
            onClick={onSubmit}
            disabled={saving || !formData.title.trim()}
            className="flex-1"
          >
            {saving ? t('admin.categories.creating') : t('admin.categories.createCategory')}
          </Button>
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={saving}
          >
            {t('admin.common.cancel')}
          </Button>
        </div>
      </div>
      </div>
    </div>
  );
}




