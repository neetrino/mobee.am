import { apiClient } from '@/lib/api-client';
import {
  getCachedAdminReference,
  type AdminReferenceCacheKey,
} from '@/lib/admin/admin-reference-cache';

const ENDPOINT_BY_KEY: Record<AdminReferenceCacheKey, string> = {
  categories: '/api/v1/admin/categories',
  brands: '/api/v1/admin/brands',
  settings: '/api/v1/admin/settings',
  delivery: '/api/v1/admin/delivery',
  'price-filter-settings': '/api/v1/admin/settings/price-filter',
};

/**
 * Cached GET for stable admin reference endpoints.
 */
export function fetchAdminReference<T>(key: AdminReferenceCacheKey): Promise<T> {
  return getCachedAdminReference(key, () => apiClient.get<T>(ENDPOINT_BY_KEY[key]));
}
