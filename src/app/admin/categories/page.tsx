'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth/AuthContext';
import { Card, Button, Input } from '@/app/admin/lib/adminShopUi';
import { useTranslation } from '../../../lib/i18n-client';
import { useCategories } from './hooks/useCategories';
import { useCategoryActions } from './hooks/useCategoryActions';
import { CategoriesHeader } from './components/CategoriesHeader';
import { AdminPageShell } from '../components/AdminPageShell';
import { CategoriesList } from './components/CategoriesList';
import { AddCategoryModal } from './components/AddCategoryModal';
import { EditCategoryModal } from './components/EditCategoryModal';

export default function CategoriesPage() {
  const { t } = useTranslation();
  const { isLoggedIn, isAdmin, isLoading } = useAuth();
  const router = useRouter();
  const { categories, loading, fetchCategories } = useCategories();
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const {
    showAddModal,
    showEditModal,
    editingCategory,
    formData,
    saving,
    setShowAddModal,
    setShowEditModal,
    setFormData,
    handleAddCategory,
    handleEditCategory,
    handleUpdateCategory,
    handleDeleteCategory,
    resetForm,
  } = useCategoryActions();

  useEffect(() => {
    if (!isLoading) {
      if (!isLoggedIn || !isAdmin) {
        router.push('/supersudo');
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
    return null;
  }

  return (
    <AdminPageShell currentPath="/supersudo/categories" router={router} t={t}>
      <div className="max-w-7xl">
        <CategoriesHeader />
        <Card className="p-6">
          <div
            className={`mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 ${
              !loading && categories.length > 0 ? 'sm:justify-between' : 'sm:justify-end'
            }`}
          >
            {!loading && categories.length > 0 ? (
              <div className="flex min-w-0 flex-1 flex-col gap-2 sm:max-w-md sm:flex-row sm:items-center">
                <label className="sr-only" htmlFor="admin-categories-search">
                  {t('admin.categories.searchLabel')}
                </label>
                <Input
                  id="admin-categories-search"
                  type="search"
                  role="searchbox"
                  value={categorySearchQuery}
                  onChange={(e) => setCategorySearchQuery(e.target.value)}
                  placeholder={t('admin.categories.searchPlaceholder')}
                  className="w-full"
                  autoComplete="off"
                />
                {categorySearchQuery.trim().length > 0 ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setCategorySearchQuery('')}>
                    {t('admin.categories.clearSearch')}
                  </Button>
                ) : null}
              </div>
            ) : null}
            <div className="flex shrink-0 justify-end">
            <Button
              variant="admin"
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              className="flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('admin.categories.addCategory')}
            </Button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-admin mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">{t('admin.categories.loadingCategories')}</p>
            </div>
          ) : (
            <CategoriesList
              categories={categories}
              searchQuery={categorySearchQuery}
              onSearchQueryChange={setCategorySearchQuery}
              onEdit={handleEditCategory}
              onDelete={(categoryId, categoryTitle) =>
                handleDeleteCategory(categoryId, categoryTitle, fetchCategories)
              }
            />
          )}
        </Card>
      </div>

      <AddCategoryModal
        isOpen={showAddModal}
        formData={formData}
        categories={categories}
        saving={saving}
        onClose={() => {
          setShowAddModal(false);
          resetForm();
        }}
        onFormDataChange={setFormData}
        onSubmit={() => handleAddCategory(fetchCategories)}
      />

      <EditCategoryModal
        isOpen={showEditModal}
        editingCategory={editingCategory}
        formData={formData}
        categories={categories}
        saving={saving}
        onClose={() => {
          setShowEditModal(false);
          resetForm();
        }}
        onFormDataChange={setFormData}
        onSubmit={() => handleUpdateCategory(fetchCategories)}
      />
    </AdminPageShell>
  );
}
