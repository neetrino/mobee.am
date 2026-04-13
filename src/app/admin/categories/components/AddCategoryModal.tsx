'use client';

import { Button, Input } from '@shop/ui';
import { useTranslation } from '../../../../lib/i18n-client';
import { showToast } from '../../../../components/Toast';
import type { Category, CategoryFormData } from '../types';

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
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
              {t('admin.categories.parentCategory')}
            </label>
            <select
              value={formData.parentId}
              onChange={(e) => onFormDataChange({ ...formData, parentId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.requiresSizes}
                onChange={(e) => onFormDataChange({ ...formData, requiresSizes: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                {t('admin.categories.requiresSizes')}
              </span>
            </label>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <Button
            variant="primary"
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
  );
}




