'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth/AuthContext';
import { Card, Button } from '@shop/ui';
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
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">{t('admin.categories.title')}</h2>
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

          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-admin mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">{t('admin.categories.loadingCategories')}</p>
            </div>
          ) : (
            <CategoriesList
              categories={categories}
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
