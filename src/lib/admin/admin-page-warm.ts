import { apiClient } from '@/lib/api-client';
import { fetchAdminReference } from '@/lib/admin/admin-reference-api';
import { dedupedAdminRequest } from '@/lib/admin/admin-request-dedup';
import {
  buildAdminSessionCacheKey,
  readAdminSessionCache,
  writeAdminSessionCache,
} from '@/lib/admin/admin-session-cache';
import { normalizeAdminPath } from '@/lib/admin/admin-nav-routes';

const DEFAULT_PRODUCTS_LIST_PARAMS = { page: '1', limit: '20' };
const DEFAULT_ORDERS_LIST_PARAMS = { page: '1', limit: '20' };
const DEFAULT_USERS_LIST_PARAMS = { page: '1', limit: '20', search: '', role: '' };
const DASHBOARD_CACHE_KEY = buildAdminSessionCacheKey('/supersudo/dashboard', {
  recentOrdersLimit: '5',
  topProductsLimit: '5',
  userActivityLimit: '10',
});

type WarmHandler = () => Promise<void>;

function warmIfMissing(cacheKey: string, loader: () => Promise<void>): Promise<void> {
  if (readAdminSessionCache(cacheKey) !== null) {
    return Promise.resolve();
  }

  return dedupedAdminRequest(`warm:${cacheKey}`, loader);
}

async function warmDashboard(): Promise<void> {
  await warmIfMissing(DASHBOARD_CACHE_KEY, async () => {
    const data = await apiClient.get('/api/v1/admin/dashboard', {
      params: {
        recentOrdersLimit: '5',
        topProductsLimit: '5',
        userActivityLimit: '10',
      },
    });
    writeAdminSessionCache(DASHBOARD_CACHE_KEY, data);
  });
}

async function warmProductsList(): Promise<void> {
  const cacheKey = buildAdminSessionCacheKey('/supersudo/products', DEFAULT_PRODUCTS_LIST_PARAMS);
  await warmIfMissing(cacheKey, async () => {
    const data = await apiClient.get('/api/v1/admin/products', { params: DEFAULT_PRODUCTS_LIST_PARAMS });
    writeAdminSessionCache(cacheKey, data);
  });
  await fetchAdminReference('categories');
}

async function warmOrdersList(): Promise<void> {
  const cacheKey = buildAdminSessionCacheKey('/supersudo/orders', DEFAULT_ORDERS_LIST_PARAMS);
  await warmIfMissing(cacheKey, async () => {
    const data = await apiClient.get('/api/v1/admin/orders', { params: DEFAULT_ORDERS_LIST_PARAMS });
    writeAdminSessionCache(cacheKey, data);
  });
}

async function warmUsersList(): Promise<void> {
  const cacheKey = buildAdminSessionCacheKey('/supersudo/users', DEFAULT_USERS_LIST_PARAMS);
  await warmIfMissing(cacheKey, async () => {
    const data = await apiClient.get('/api/v1/admin/users', { params: DEFAULT_USERS_LIST_PARAMS });
    writeAdminSessionCache(cacheKey, data);
  });
}

async function warmReferenceOnly(key: Parameters<typeof fetchAdminReference>[0]): Promise<void> {
  await fetchAdminReference(key);
}

async function warmAttributesList(): Promise<void> {
  const cacheKey = buildAdminSessionCacheKey('/supersudo/attributes', { page: '1', limit: '50' });
  await warmIfMissing(cacheKey, async () => {
    await apiClient.get('/api/v1/admin/attributes', { params: { page: '1', limit: '50' } });
  });
}

async function warmAnalytics(): Promise<void> {
  const cacheKey = buildAdminSessionCacheKey('/supersudo/analytics', { period: 'week' });
  await warmIfMissing(cacheKey, async () => {
    await apiClient.get('/api/v1/admin/analytics', { params: { period: 'week' } });
  });
}

async function warmMessages(): Promise<void> {
  const cacheKey = buildAdminSessionCacheKey('/supersudo/messages', { page: '1', limit: '20' });
  await warmIfMissing(cacheKey, async () => {
    await apiClient.get('/api/v1/admin/messages', { params: { page: '1', limit: '20' } });
  });
}

async function warmInventory(): Promise<void> {
  const cacheKey = buildAdminSessionCacheKey('/supersudo/inventory', { page: '1', limit: '20' });
  await warmIfMissing(cacheKey, async () => {
    await apiClient.get('/api/v1/admin/inventory', { params: { page: '1', limit: '20' } });
  });
}

const WARM_BY_PATH: Record<string, WarmHandler> = {
  '/supersudo': warmDashboard,
  '/supersudo/products': warmProductsList,
  '/supersudo/orders': warmOrdersList,
  '/supersudo/users': warmUsersList,
  '/supersudo/categories': () => warmReferenceOnly('categories'),
  '/supersudo/brands': () => warmReferenceOnly('brands'),
  '/supersudo/attributes': warmAttributesList,
  '/supersudo/analytics': warmAnalytics,
  '/supersudo/settings': () => warmReferenceOnly('settings'),
  '/supersudo/delivery': () => warmReferenceOnly('delivery'),
  '/supersudo/price-filter-settings': () => warmReferenceOnly('price-filter-settings'),
  '/supersudo/home-hero': () => warmReferenceOnly('home-hero'),
  '/supersudo/messages': warmMessages,
  '/supersudo/inventory': warmInventory,
};

/**
 * Fire-and-forget API warm for an admin route (never blocks UI, never throws).
 */
export function warmAdminPageApi(href: string): void {
  const path = normalizeAdminPath(href);
  const handler = WARM_BY_PATH[path];
  if (!handler) {
    return;
  }

  void handler().catch(() => {
    // warm failures are silent
  });
}

export {
  DASHBOARD_CACHE_KEY,
  DEFAULT_PRODUCTS_LIST_PARAMS,
  DEFAULT_ORDERS_LIST_PARAMS,
  DEFAULT_USERS_LIST_PARAMS,
};
