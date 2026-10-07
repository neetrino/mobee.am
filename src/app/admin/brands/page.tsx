'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { Card, Button, Input } from '@/app/admin/lib/adminShopUi';
import { apiClient } from '../../../lib/api-client';
import { fetchAdminReference } from '@/lib/admin/admin-reference-api';
import { invalidateAdminReferenceCache } from '@/lib/admin/admin-reference-cache';
import { useTranslation } from '../../../lib/i18n-client';
import { AdminSideSheet } from '../components/AdminSideSheet';
import { showToast } from '@/components/Toast';
import { confirmDialog } from '@/components/ConfirmDialog';
import { BrandLogoField } from './components/BrandLogoField';
import { AdminTranslationTabs } from '../components/AdminTranslationTabs';
import {
  DEFAULT_ADMIN_CONTENT_LOCALE,
  emptyAdminLocaleTextMap,
  type AdminContentLocale,
  type AdminLocaleTextMap,
} from '@/lib/admin/admin-content-locale';

interface Brand {
  id: string;
  name: string;
  names?: AdminLocaleTextMap;
  slug: string;
  logoUrl: string | null;
}

function BrandsSection() {
  const { t } = useTranslation();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [translationLocale, setTranslationLocale] = useState<AdminContentLocale>(DEFAULT_ADMIN_CONTENT_LOCALE);
  const [formData, setFormData] = useState({
    names: emptyAdminLocaleTextMap(),
    logoUrl: null as string | null,
  });
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
      const response = await fetchAdminReference<{ data: Brand[] }>('brands');
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
    if (!(await confirmDialog({
      message: t('admin.brands.deleteConfirm').replace('{name}', brandName),
      variant: 'danger',
    }))) {
      return;
    }

    try {
      console.log(`🗑️ [ADMIN] Deleting brand: ${brandName} (${brandId})`);
      await apiClient.delete(`/api/v1/admin/brands/${brandId}`);
      invalidateAdminReferenceCache('brands');
      fetchBrands();
      showToast(t('admin.brands.deletedSuccess'), 'success');
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
      showToast(t('admin.brands.errorDeleting') + '\n\n' + errorMessage, 'error');
    }
  };

  const handleOpenAddModal = () => {
    setEditingBrand(null);
    setTranslationLocale(DEFAULT_ADMIN_CONTENT_LOCALE);
    setFormData({ names: emptyAdminLocaleTextMap(), logoUrl: null });
    setShowModal(true);
  };

  const handleOpenEditModal = (brand: Brand) => {
    setEditingBrand(brand);
    setTranslationLocale(DEFAULT_ADMIN_CONTENT_LOCALE);
    setFormData({
      names: brand.names ?? {
        hy: brand.name,
        en: '',
        ru: '',
      },
      logoUrl: brand.logoUrl,
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingBrand(null);
    setTranslationLocale(DEFAULT_ADMIN_CONTENT_LOCALE);
    setFormData({ names: emptyAdminLocaleTextMap(), logoUrl: null });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const primaryName =
      formData.names.hy.trim() ||
      formData.names.en.trim() ||
      formData.names.ru.trim();
    if (!primaryName) {
      showToast(t('admin.brands.nameRequired'), 'warning');
      return;
    }

    setSubmitting(true);
    try {
      if (editingBrand) {
        await apiClient.put(`/api/v1/admin/brands/${editingBrand.id}`, {
          name: primaryName,
          names: formData.names,
          logoUrl: formData.logoUrl,
          locale: DEFAULT_ADMIN_CONTENT_LOCALE,
        });
        showToast(t('admin.brands.updatedSuccess'), 'success');
      } else {
        await apiClient.post('/api/v1/admin/brands', {
          name: primaryName,
          names: formData.names,
          logoUrl: formData.logoUrl,
          locale: DEFAULT_ADMIN_CONTENT_LOCALE,
        });
        showToast(t('admin.brands.createdSuccess'), 'success');
      }
      
      invalidateAdminReferenceCache('brands');
      fetchBrands();
      handleCloseModal();
    } catch (err: unknown) {
      console.error('❌ [ADMIN] Error saving brand:', err);
      let errorMessage = 'Unknown error occurred';
      if (err && typeof err === 'object') {
        const errorObj = err as {
          data?: { detail?: string };
          detail?: string;
          message?: string;
          response?: { data?: { detail?: string } };
        };
        if (errorObj.data?.detail) {
          errorMessage = errorObj.data.detail;
        } else if (errorObj.detail) {
          errorMessage = errorObj.detail;
        } else if (errorObj.message) {
          errorMessage = errorObj.message;
        } else if (errorObj.response?.data?.detail) {
          errorMessage = errorObj.response.data.detail;
        }
      }
      showToast(t('admin.brands.errorSaving') + '\n\n' + errorMessage, 'error');
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
      <div
        className={`mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 ${
          brands.length > 0 ? 'sm:justify-between' : 'sm:justify-end'
        }`}
      >
        {brands.length > 0 ? (
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:max-w-md sm:flex-row sm:items-center">
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
              className="w-full"
              autoComplete="off"
            />
            {searchQuery.trim().length > 0 ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setSearchQuery('')}>
                {t('admin.brands.clearSearch')}
              </Button>
            ) : null}
          </div>
        ) : null}
        <div className="flex shrink-0 justify-end">
        <Button
          onClick={handleOpenAddModal}
          variant="admin"
          className="flex items-center gap-2"
        >
          <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('admin.brands.addNew')}
        </Button>
        </div>
      </div>

      {brands.length === 0 ? (
        <p className="text-sm text-gray-500 py-2">{t('admin.brands.noBrands')}</p>
      ) : (
        <>
          {filteredBrands.length === 0 ? (
            <p className="text-sm text-gray-500 py-2">{t('admin.brands.noSearchResults')}</p>
          ) : (
        <div className="space-y-2">
        {filteredBrands.map((brand) => (
          <div
            key={brand.id}
            className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-supersudo hover:bg-gray-100 transition-colors"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative size-10 shrink-0 overflow-hidden rounded-supersudo border border-gray-200 bg-white">
                {brand.logoUrl ? (
                  <Image
                    src={brand.logoUrl}
                    alt=""
                    fill
                    sizes="40px"
                    className="object-contain"
                  />
                ) : null}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-900">{brand.name}</div>
                <div className="text-xs text-gray-500">{brand.slug}</div>
              </div>
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

      <AdminSideSheet
        open={showModal}
        onClose={handleCloseModal}
        title={editingBrand ? t('admin.brands.editBrand') : t('admin.brands.addNewBrand')}
        closeLabel={t('admin.brands.cancel')}
        blockClose={submitting}
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={handleCloseModal} disabled={submitting}>
              {t('admin.brands.cancel')}
            </Button>
            <Button type="submit" form="admin-brand-form" variant="admin" disabled={submitting}>
              {submitting ? t('admin.brands.saving') : (editingBrand ? t('admin.brands.update') : t('admin.brands.create'))}
            </Button>
          </div>
        }
      >
            <form id="admin-brand-form" onSubmit={handleSubmit} className="space-y-4">
              <AdminTranslationTabs
                value={translationLocale}
                onChange={setTranslationLocale}
              />

              <div>
                <label htmlFor="brand-name" className="mb-1 block text-sm font-medium text-gray-700">
                  {t('admin.brands.brandName')}
                </label>
                <input
                  id="brand-name"
                  type="text"
                  value={formData.names[translationLocale]}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      names: { ...formData.names, [translationLocale]: e.target.value },
                    })
                  }
                  className="w-full rounded-supersudo border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-admin"
                  placeholder={t('admin.brands.enterBrandName')}
                  required
                />
              </div>

              <BrandLogoField
                logoUrl={formData.logoUrl}
                onChange={(logoUrl) => setFormData({ ...formData, logoUrl })}
              />

            </form>
      </AdminSideSheet>
    </>
  );
}

export default function BrandsPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t('admin.brands.title')}</h1>
        <p className="mt-2 text-sm text-gray-500">{t('admin.brands.logoHint')}</p>
      </div>

      <Card className="p-6">
        <BrandsSection />
      </Card>
    </div>
  );
}

