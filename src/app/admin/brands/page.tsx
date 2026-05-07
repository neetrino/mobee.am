'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../../lib/auth/AuthContext';
import { Card, Button, Input } from '@shop/ui';
import { apiClient } from '../../../lib/api-client';
import { useTranslation } from '../../../lib/i18n-client';
import { AdminPageShell } from '../components/AdminPageShell';

interface Brand {
  id: string;
  name: string;
  slug: string;
}

function BrandsSection() {
  const { t } = useTranslation();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [formData, setFormData] = useState({ name: '' });
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBrands = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return brands;
    }
    return brands.filter(
      (b) => b.name.toLowerCase().includes(q) || b.slug.toLowerCase().includes(q),
    );
  }, [brands, searchQuery]);

  const fetchBrands = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🏷️ [ADMIN] Fetching brands...');
      const response = await apiClient.get<{ data: Brand[] }>('/api/v1/admin/brands');
      setBrands(response.data || []);
      console.log('✅ [ADMIN] Brands loaded:', response.data?.length || 0);
    } catch (err) {
      console.error('❌ [ADMIN] Error fetching brands:', err);
      setBrands([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  const handleDeleteBrand = async (brandId: string, brandName: string) => {
    if (!confirm(t('admin.brands.deleteConfirm').replace('{name}', brandName))) {
      return;
    }

    try {
      console.log(`🗑️ [ADMIN] Deleting brand: ${brandName} (${brandId})`);
      await apiClient.delete(`/api/v1/admin/brands/${brandId}`);
      console.log('✅ [ADMIN] Brand deleted successfully');
      fetchBrands();
      alert(t('admin.brands.deletedSuccess'));
    } catch (err: any) {
      console.error('❌ [ADMIN] Error deleting brand:', err);
      let errorMessage = 'Unknown error occurred';
      if (err.data?.detail) {
        errorMessage = err.data.detail;
      } else if (err.detail) {
        errorMessage = err.detail;
      } else if (err.message) {
        errorMessage = err.message;
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      }
      alert(t('admin.brands.errorDeleting') + '\n\n' + errorMessage);
    }
  };

  const handleOpenAddModal = () => {
    setEditingBrand(null);
    setFormData({ name: '' });
    setShowModal(true);
  };

  const handleOpenEditModal = (brand: Brand) => {
    setEditingBrand(brand);
    setFormData({ name: brand.name });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingBrand(null);
    setFormData({ name: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert(t('admin.brands.nameRequired'));
      return;
    }

    setSubmitting(true);
    try {
      if (editingBrand) {
        // Update existing brand
        console.log('🔄 [ADMIN] Updating brand:', editingBrand.id);
        await apiClient.put(`/api/v1/admin/brands/${editingBrand.id}`, {
          name: formData.name.trim(),
        });
        console.log('✅ [ADMIN] Brand updated successfully');
        alert(t('admin.brands.updatedSuccess'));
      } else {
        // Create new brand
        console.log('➕ [ADMIN] Creating brand:', formData.name);
        await apiClient.post('/api/v1/admin/brands', {
          name: formData.name.trim(),
        });
        console.log('✅ [ADMIN] Brand created successfully');
        alert(t('admin.brands.createdSuccess'));
      }
      
      fetchBrands();
      handleCloseModal();
    } catch (err: any) {
      console.error('❌ [ADMIN] Error saving brand:', err);
      let errorMessage = 'Unknown error occurred';
      if (err.data?.detail) {
        errorMessage = err.data.detail;
      } else if (err.detail) {
        errorMessage = err.detail;
      } else if (err.message) {
        errorMessage = err.message;
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      }
      alert(t('admin.brands.errorSaving') + '\n\n' + errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-admin mx-auto mb-2"></div>
        <p className="text-sm text-gray-600">{t('admin.brands.loading')}</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">{t('admin.brands.title')}</h2>
        <Button
          onClick={handleOpenAddModal}
          variant="admin"
          size="sm"
          className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap"
        >
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('admin.brands.addNew')}
        </Button>
      </div>

      {brands.length === 0 ? (
        <p className="text-sm text-gray-500 py-2">{t('admin.brands.noBrands')}</p>
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="sr-only" htmlFor="admin-brands-search">
              {t('admin.brands.searchLabel')}
            </label>
            <Input
              id="admin-brands-search"
              type="search"
              role="searchbox"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('admin.brands.searchPlaceholder')}
              className="w-full sm:max-w-md"
              autoComplete="off"
            />
            {searchQuery.trim().length > 0 ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setSearchQuery('')}>
                {t('admin.brands.clearSearch')}
              </Button>
            ) : null}
          </div>
          {filteredBrands.length === 0 ? (
            <p className="text-sm text-gray-500 py-2">{t('admin.brands.noSearchResults')}</p>
          ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredBrands.map((brand) => (
          <div
            key={brand.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div>
              <div className="text-sm font-medium text-gray-900">{brand.name}</div>
              <div className="text-xs text-gray-500">{brand.slug}</div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenEditModal(brand)}
                className="text-admin-600 hover:text-admin-800 hover:bg-admin-50"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {t('admin.brands.edit')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteBrand(brand.id, brand.name)}
                className="text-red-600 hover:text-red-800 hover:bg-red-50"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {t('admin.brands.delete')}
              </Button>
            </div>
          </div>
        ))}
        </div>
          )}
        </>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingBrand ? t('admin.brands.editBrand') : t('admin.brands.addNewBrand')}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 transition-colors hover:text-admin-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="brand-name" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.brands.brandName')}
                </label>
                <input
                  id="brand-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-admin focus:border-transparent"
                  placeholder={t('admin.brands.enterBrandName')}
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseModal}
                  disabled={submitting}
                >
                  {t('admin.brands.cancel')}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={submitting}
                >
                  {submitting ? t('admin.brands.saving') : (editingBrand ? t('admin.brands.update') : t('admin.brands.create'))}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default function BrandsPage() {
  const { t } = useTranslation();
  const { isLoggedIn, isAdmin, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
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
    <AdminPageShell currentPath={pathname || '/supersudo/brands'} router={router} t={t}>
      <div className="max-w-7xl">
        <div className="mb-8">
          <button
            onClick={() => router.push('/supersudo')}
            className="text-gray-600 hover:text-gray-900 mb-4 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('admin.common.backToAdmin')}
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{t('admin.brands.title')}</h1>
        </div>

        <Card className="p-6">
          <BrandsSection />
        </Card>
      </div>
    </AdminPageShell>
  );
}

