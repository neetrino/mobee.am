'use client';

import { AdminSideSheet } from '../../components/AdminSideSheet';
import { Button, Input } from '@/app/admin/lib/adminShopUi';
import { useTranslation } from '../../../../lib/i18n-client';
import { AdminFormSelectDropdown } from '../../components/AdminFormSelectDropdown';
import type { Category, CategoryFormData } from '../types';
import { CategoryImageField } from './CategoryImageField';
import { AdminTranslationTabs } from '../../components/AdminTranslationTabs';
import { filledLocaleEntries, type AdminContentLocale } from '@/lib/admin/admin-content-locale';
import { syncSlugWithTitle } from '@/lib/utils/slug';

interface AddCategoryModalProps {
  isOpen: boolean;
  formData: CategoryFormData;
  categories: Category[];
  saving: boolean;
  translationLocale: AdminContentLocale;
  onTranslationLocaleChange: (locale: AdminContentLocale) => void;
  onClose: () => void;
  onFormDataChange: (data: CategoryFormData) => void;
  onSubmit: () => Promise<void>;
}

export function AddCategoryModal({
  isOpen,
  formData,
  categories,
  saving,
  translationLocale,
  onTranslationLocaleChange,
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
    <AdminSideSheet
      open={isOpen}
      onClose={onClose}
      title={t('admin.categories.addCategory')}
      closeLabel={t('admin.common.cancel')}
      blockClose={saving}
      footer={
        <div className="flex gap-3">
          <Button
            variant="admin"
            onClick={onSubmit}
            disabled={saving || filledLocaleEntries(formData.titles).length === 0}
            className="flex-1"
          >
            {saving ? t('admin.categories.creating') : t('admin.categories.createCategory')}
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            {t('admin.common.cancel')}
          </Button>
        </div>
      }
    >
          <div className="space-y-4">
            <AdminTranslationTabs
              value={translationLocale}
              onChange={onTranslationLocaleChange}
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t('admin.categories.categoryTitle')} *
              </label>
              <Input
                type="text"
                value={formData.titles[translationLocale]}
                onChange={(e) =>
                  onFormDataChange({
                    ...formData,
                    titles: { ...formData.titles, [translationLocale]: e.target.value },
                    slug: syncSlugWithTitle(
                      formData.titles[translationLocale],
                      formData.slug,
                      e.target.value,
                    ),
                  })
                }
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
              <p className="mt-1 text-xs text-gray-500">{t('admin.common.sharedSlugHint')}</p>
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
    </AdminSideSheet>
  );
}
