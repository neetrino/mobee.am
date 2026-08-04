'use client';

import { useEffect, useState } from 'react';
import { AnimatedModalPortal } from '@/components/AnimatedModalPortal';
import { Button, Input } from '@/app/admin/lib/adminShopUi';
import { useTranslation } from '../../../../lib/i18n-client';
import { AdminFormSelectDropdown } from '../../components/AdminFormSelectDropdown';
import type { Category, CategoryFormData } from '../types';
import { CategoryImageField } from './CategoryImageField';

interface EditCategoryModalProps {
  isOpen: boolean;
  editingCategory: Category | null;
  formData: CategoryFormData;
  categories: Category[];
  saving: boolean;
  onClose: () => void;
  onFormDataChange: (data: CategoryFormData) => void;
  onSubmit: () => Promise<void>;
}

export function EditCategoryModal({
  isOpen,
  editingCategory,
  formData,
  categories,
  saving,
  onClose,
  onFormDataChange,
  onSubmit,
}: EditCategoryModalProps) {
  const { t } = useTranslation();
  const [categorySnapshot, setCategorySnapshot] = useState<Category | null>(editingCategory);
  const modalOpen = isOpen && editingCategory !== null;

  useEffect(() => {
    if (editingCategory) {
      setCategorySnapshot(editingCategory);
    }
  }, [editingCategory]);

  const parentOptions = categorySnapshot
    ? [
        { value: '', label: t('admin.categories.rootCategory') },
        ...categories
          .filter((cat) => cat.id !== categorySnapshot.id && !cat.parentId)
          .map((cat) => ({ value: cat.id, label: cat.title })),
      ]
    : [{ value: '', label: t('admin.categories.rootCategory') }];

  return (
    <AnimatedModalPortal
      isOpen={modalOpen}
      onClose={onClose}
      closeAriaLabel={t('admin.common.cancel')}
      blockClose={saving}
      labelledBy="edit-category-modal-title"
      panelClassName="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-supersudo bg-white p-6"
    >
      {({ requestClose }) => {
        if (!categorySnapshot) {
          return null;
        }

        return (
          <>
            <h3 id="edit-category-modal-title" className="mb-4 text-lg font-semibold text-gray-900">
              {t('admin.categories.editCategory')}
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
                  {t('admin.categories.categorySlug')} *
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
                <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="edit-category-parent-trigger">
                  {t('admin.categories.parentCategory')}
                </label>
                <AdminFormSelectDropdown
                  id="edit-category-parent"
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
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Subcategories
                </label>
                <div className="max-h-60 space-y-2 overflow-y-auto rounded-supersudo border border-gray-300 p-3">
                  {categories
                    .filter((cat) => cat.id !== categorySnapshot.id)
                    .map((cat) => {
                      const isChecked = formData.subcategoryIds.includes(cat.id);
                      return (
                        <label key={cat.id} className="flex cursor-pointer items-center gap-2 rounded-supersudo p-2 hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                onFormDataChange({
                                  ...formData,
                                  subcategoryIds: [...formData.subcategoryIds, cat.id],
                                });
                              } else {
                                onFormDataChange({
                                  ...formData,
                                  subcategoryIds: formData.subcategoryIds.filter(id => id !== cat.id),
                                });
                              }
                            }}
                            className="h-4 w-4 rounded-supersudo border-gray-300 text-admin-600 focus:ring-admin"
                          />
                          <span className="text-sm text-gray-700">{cat.title}</span>
                        </label>
                      );
                    })}
                  {categories.filter((cat) =>
                    cat.id !== categorySnapshot.id &&
                    cat.parentId !== categorySnapshot.id
                  ).length === 0 && (
                    <p className="text-sm text-gray-500">No available categories to assign as subcategories</p>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <Button
                variant="admin"
                onClick={onSubmit}
                disabled={saving || !formData.title.trim() || !formData.slug.trim()}
                className="flex-1"
              >
                {saving ? t('admin.categories.updating') : t('admin.categories.updateCategory')}
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
        );
      }}
    </AnimatedModalPortal>
  );
}
