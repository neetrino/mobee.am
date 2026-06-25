import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import {
  ADMIN_PRIORITY_PREFETCH_ROUTES,
  normalizeAdminPath,
} from '@/lib/admin/admin-nav-routes';
import { warmAdminPageApi } from '@/lib/admin/admin-page-warm';

const prefetchedRoutes = new Set<string>();

function shouldSkipPrefetch(href: string, currentPath?: string | null): boolean {
  const normalized = normalizeAdminPath(href);
  if (currentPath && normalizeAdminPath(currentPath) === normalized) {
    return true;
  }
  return prefetchedRoutes.has(normalized);
}

function markPrefetched(href: string): void {
  prefetchedRoutes.add(normalizeAdminPath(href));
}

/**
 * Prefetch a single admin route chunk (+ optional API warm).
 */
export function prefetchAdminRoute(
  router: AppRouterInstance,
  href: string,
  currentPath?: string | null,
): void {
  const normalized = normalizeAdminPath(href);
  if (shouldSkipPrefetch(normalized, currentPath)) {
    return;
  }

  try {
    router.prefetch(normalized);
    markPrefetched(normalized);
  } catch {
    // ignore dev/offline prefetch failures
  }

  warmAdminPageApi(normalized);
}

/**
 * Idle warm for priority admin routes (dashboard, products, orders, settings).
 */
export function prefetchPriorityAdminRoutes(
  router: AppRouterInstance,
  currentPath?: string | null,
): void {
  for (const href of ADMIN_PRIORITY_PREFETCH_ROUTES) {
    prefetchAdminRoute(router, href, currentPath);
  }
}

/**
 * Staggered warm for all admin routes — dev-safe (called from hover only, not bulk idle).
 */
export function prefetchAllAdminRoutes(
  router: AppRouterInstance,
  currentPath?: string | null,
): void {
  for (const href of ADMIN_PRIORITY_PREFETCH_ROUTES) {
    prefetchAdminRoute(router, href, currentPath);
  }
}

export function resetAdminRoutePrefetchState(): void {
  prefetchedRoutes.clear();
}
