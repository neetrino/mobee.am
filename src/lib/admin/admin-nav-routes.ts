/** Canonical admin routes exposed at `/supersudo/*`. */
export const ADMIN_NAV_ROUTES = [
  '/supersudo',
  '/supersudo/products',
  '/supersudo/products/add',
  '/supersudo/orders',
  '/supersudo/users',
  '/supersudo/categories',
  '/supersudo/brands',
  '/supersudo/attributes',
  '/supersudo/analytics',
  '/supersudo/settings',
  '/supersudo/delivery',
  '/supersudo/price-filter-settings',
  '/supersudo/home-hero',
  '/supersudo/messages',
  '/supersudo/inventory',
  '/supersudo/quick-settings',
  '/supersudo/promocodes',
] as const;

export type AdminNavRoute = (typeof ADMIN_NAV_ROUTES)[number];

/** Warm first on idle — high-traffic admin destinations. */
export const ADMIN_PRIORITY_PREFETCH_ROUTES: AdminNavRoute[] = [
  '/supersudo',
  '/supersudo/products',
  '/supersudo/orders',
  '/supersudo/settings',
];

export function isAdminNavRoute(path: string): path is AdminNavRoute {
  return (ADMIN_NAV_ROUTES as readonly string[]).includes(path);
}

export function normalizeAdminPath(path: string): string {
  if (path === '/admin' || path.startsWith('/admin/')) {
    return path.replace(/^\/admin/, '/supersudo');
  }
  return path;
}
