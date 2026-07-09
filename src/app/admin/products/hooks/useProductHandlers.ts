import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { apiClient } from '../../../../lib/api-client';
import { invalidateAdminSessionCacheByPrefix } from '@/lib/admin/admin-session-cache';
import { useTranslation } from '../../../../lib/i18n-client';
import { showToast } from '../../../../components/Toast';
import { confirmDialog } from '../../../../components/ConfirmDialog';
import type { Product } from '../types';

function patchProductInList(
  setProducts: Dispatch<SetStateAction<Product[]>>,
  productId: string,
  patch: Partial<Product>,
): void {
  setProducts((prev) =>
    prev.map((product) =>
      product.id === productId ? { ...product, ...patch } : product,
    ),
  );
}

interface UseProductHandlersProps {
  products: Product[];
  setProducts: Dispatch<SetStateAction<Product[]>>;
  fetchProducts: (force?: boolean) => Promise<void>;
  selectedIds: Set<string>;
  setSelectedIds: (ids: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  setPage: (page: number | ((prev: number) => number)) => void;
  setBulkDeleting: (deleting: boolean) => void;
  setTogglingAllFeatured: (toggling: boolean) => void;
}

export function useProductHandlers({
  products,
  setProducts,
  fetchProducts,
  selectedIds,
  setSelectedIds,
  setPage,
  setBulkDeleting,
  setTogglingAllFeatured,
}: UseProductHandlersProps) {
  const { t } = useTranslation();

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (products.length === 0) return;
    setSelectedIds(prev => {
      const allIds = products.map(p => p.id);
      const hasAll = allIds.every(id => prev.has(id));
      return hasAll ? new Set() : new Set(allIds);
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!(await confirmDialog({
      message: t('admin.products.bulkDeleteConfirm').replace('{count}', selectedIds.size.toString()),
      variant: 'danger',
    }))) return;
    setBulkDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      const results = await Promise.allSettled(
        ids.map(id => apiClient.delete(`/api/v1/admin/products/${id}`))
      );
      const failed = results.filter(r => r.status === 'rejected');
      setSelectedIds(new Set());
      await fetchProducts();
      showToast(
        t('admin.products.bulkDeleteFinished').replace('{success}', (ids.length - failed.length).toString()).replace('{total}', ids.length.toString()),
        failed.length > 0 ? 'warning' : 'success',
      );
    } catch (err) {
      console.error('❌ [ADMIN] Bulk delete products error:', err);
      showToast(t('admin.products.failedToDelete'), 'error');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleDeleteProduct = async (productId: string, productTitle: string) => {
    if (!(await confirmDialog({
      message: t('admin.products.deleteConfirm').replace('{title}', productTitle),
      variant: 'danger',
    }))) {
      return;
    }

    try {
      await apiClient.delete(`/api/v1/admin/products/${productId}`);
      console.log('✅ [ADMIN] Product deleted successfully');
      
      // Refresh products list
      fetchProducts();
      
      showToast(t('admin.products.deletedSuccess'), 'success');
    } catch (err: any) {
      console.error('❌ [ADMIN] Error deleting product:', err);
      showToast(t('admin.products.errorDeleting').replace('{message}', err.message || t('admin.common.unknownErrorFallback')), 'error');
    }
  };

  const handleTogglePublished = async (productId: string, currentStatus: boolean, productTitle: string) => {
    const newStatus = !currentStatus;
    patchProductInList(setProducts, productId, { published: newStatus });

    try {
      await apiClient.put(`/api/v1/admin/products/${productId}`, { published: newStatus });
      invalidateAdminSessionCacheByPrefix('/supersudo/products');

      if (newStatus) {
        showToast(t('admin.products.productPublished').replace('{title}', productTitle), 'success');
      } else {
        showToast(t('admin.products.productDraft').replace('{title}', productTitle), 'success');
      }
    } catch (err: unknown) {
      patchProductInList(setProducts, productId, { published: currentStatus });
      const message = err instanceof Error ? err.message : t('admin.common.unknownErrorFallback');
      console.error('❌ [ADMIN] Error updating product status:', err);
      showToast(t('admin.products.errorUpdatingStatus').replace('{message}', message), 'error');
    }
  };

  const handleToggleFeatured = async (productId: string, currentStatus: boolean, _productTitle: string) => {
    const newStatus = !currentStatus;
    patchProductInList(setProducts, productId, { featured: newStatus });

    try {
      await apiClient.put(`/api/v1/admin/products/${productId}`, { featured: newStatus });
      invalidateAdminSessionCacheByPrefix('/supersudo/products');
    } catch (err: unknown) {
      patchProductInList(setProducts, productId, { featured: currentStatus });
      const message = err instanceof Error ? err.message : t('admin.common.unknownErrorFallback');
      console.error('❌ [ADMIN] Error updating product featured status:', err);
      showToast(t('admin.products.errorUpdatingFeatured').replace('{message}', message), 'error');
    }
  };

  const handleToggleAllFeatured = async () => {
    if (products.length === 0) return;

    const allFeatured = products.every((product) => product.featured);
    const newStatus = !allFeatured;
    const previousById = new Map(products.map((product) => [product.id, product.featured ?? false]));

    setProducts((prev) => prev.map((product) => ({ ...product, featured: newStatus })));
    setTogglingAllFeatured(true);

    try {
      const results = await Promise.allSettled(
        products.map((product) =>
          apiClient.put(`/api/v1/admin/products/${product.id}`, { featured: newStatus }),
        ),
      );

      const failedIds = products
        .filter((_, index) => results[index]?.status === 'rejected')
        .map((product) => product.id);

      if (failedIds.length > 0) {
        setProducts((prev) =>
          prev.map((product) =>
            failedIds.includes(product.id)
              ? { ...product, featured: previousById.get(product.id) ?? false }
              : product,
          ),
        );
        showToast(
          t('admin.products.featuredToggleFinished')
            .replace('{success}', (products.length - failedIds.length).toString())
            .replace('{total}', products.length.toString()),
          'warning',
        );
      }

      invalidateAdminSessionCacheByPrefix('/supersudo/products');
    } catch (err) {
      setProducts((prev) =>
        prev.map((product) => ({
          ...product,
          featured: previousById.get(product.id) ?? false,
        })),
      );
      console.error('❌ [ADMIN] Toggle all featured error:', err);
      showToast(t('admin.products.failedToUpdateFeatured'), 'error');
    } finally {
      setTogglingAllFeatured(false);
    }
  };

  return {
    handleSearch,
    toggleSelect,
    toggleSelectAll,
    handleBulkDelete,
    handleDeleteProduct,
    handleTogglePublished,
    handleToggleFeatured,
    handleToggleAllFeatured,
  };
}






