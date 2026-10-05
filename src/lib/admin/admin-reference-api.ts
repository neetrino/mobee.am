import { apiClient } from '@/lib/api-client';
import {
  getCachedAdminReference,
  type AdminReferenceCacheKey,
} from '@/lib/admin/admin-reference-cache';
import type { AdminContentLocale } from '@/lib/admin/admin-content-locale';

const ENDPOINT_BY_KEY: Record<AdminReferenceCacheKey, string> = {
  categories: '/api/v1/admin/categories',
  brands: '/api/v1/admin/brands',
  settings: '/api/v1/admin/settings',
  delivery: '/api/v1/admin/delivery',
  'price-filter-settings': '/api/v1/admin/settings/price-filter',
  'home-hero': '/api/v1/admin/settings/home-hero',
};

export type FetchAdminReferenceOptions = {
  locale?: AdminContentLocale;
};

/**
 * Cached GET for stable admin reference endpoints.
 */
export function fetchAdminReference<T>(
  key: AdminReferenceCacheKey,
  options?: FetchAdminReferenceOptions,
): Promise<T> {
  const locale = options?.locale;
  const endpoint = ENDPOINT_BY_KEY[key];
  const url =
    locale && (key === 'categories' || key === 'brands')
      ? `${endpoint}?locale=${encodeURIComponent(locale)}`
      : endpoint;

  return getCachedAdminReference(key, () => apiClient.get<T>(url), locale);
}
