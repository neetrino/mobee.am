'use client';

import { AnimatedModalPortal } from '@/components/AnimatedModalPortal';
import { Button, Input } from '@/app/admin/lib/adminShopUi';
import { useTranslation } from '../../../../lib/i18n-client';
import { AdminFormSelectDropdown } from '../../components/AdminFormSelectDropdown';
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

  const parentOptions = [
    { value: '', label: t('admin.categories.rootCategory') },
    ...categories
      .filter((cat) => !cat.parentId)
      .map((cat) => ({ value: cat.id, label: cat.title })),
  ];

  return (
    <AnimatedModalPortal
      isOpen={isOpen}
      onClose={onClose}
      closeAriaLabel={t('admin.common.cancel')}
      blockClose={saving}
      labelledBy="add-category-modal-title"
      panelClassName="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-supersudo bg-white p-6"
    >
      {({ requestClose }) => (
        <>
          <h3 id="add-category-modal-title" className="mb-4 text-lg font-semibold text-gray-900">
            {t('admin.categories.addCategory')}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
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
              <label className="mb-1 block text-sm font-medium text-gray-700">
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
              <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="add-category-parent-trigger">
                {t('admin.categories.parentCategory')}
              </label>
              <AdminFormSelectDropdown
                id="add-category-parent"
                value={formData.parentId}
                options={parentOptions}
                onChange={(next) => onFormDataChange({ ...formData, parentId: next })}
                ariaLabel={t('admin.categories.parentCategory')}
                disabled={saving}
                portalFlyout
              />
            </div>
            <CategoryImageField
              imageUrl={formData.imageUrl}
              onChange={(imageUrl) => onFormDataChange({ ...formData, imageUrl })}
            />
            <div>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.requiresSizes}
                  onChange={(e) => onFormDataChange({ ...formData, requiresSizes: e.target.checked })}
                  className="h-4 w-4 rounded-supersudo border-gray-300 text-admin-600 focus:ring-admin"
                />
                <span className="text-sm text-gray-700">
                  {t('admin.categories.requiresSizes')}
                </span>
              </label>
            </div>
          </div>
          <div className="mt-6 flex gap-3">
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
              onClick={requestClose}
              disabled={saving}
            >
              {t('admin.common.cancel')}
            </Button>
          </div>
        </>
      )}
    </AnimatedModalPortal>
  );
}
