'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { normalizeAdminPath } from '@/lib/admin/admin-nav-routes';
import { prefetchAdminRoute, prefetchPriorityAdminRoutes } from '@/lib/admin/admin-route-prefetch';
import { warmAdminPageApi } from '@/lib/admin/admin-page-warm';

const OPTIMISTIC_NAV_TIMEOUT_MS = 4000;

type AdminNavContextValue = {
  effectivePath: string;
  beginAdminNavigation: (href: string) => void;
  prefetchAdminNavigation: (href: string) => void;
  router: AppRouterInstance;
};

const AdminNavContext = createContext<AdminNavContextValue | null>(null);

export function AdminNavProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [optimisticPath, setOptimisticPath] = useState<string | null>(null);

  const normalizedPathname = normalizeAdminPath(pathname || '/supersudo');

  useEffect(() => {
    if (optimisticPath && normalizeAdminPath(optimisticPath) === normalizedPathname) {
      setOptimisticPath(null);
    }
  }, [normalizedPathname, optimisticPath]);

  useEffect(() => {
    if (!optimisticPath) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setOptimisticPath(null);
    }, OPTIMISTIC_NAV_TIMEOUT_MS);

    return () => window.clearTimeout(timeoutId);
  }, [optimisticPath]);

  useEffect(() => {
    let idleId: ReturnType<typeof requestIdleCallback> | undefined;
    let timeoutId: number | undefined;

    const run = () => {
      prefetchPriorityAdminRoutes(router, normalizedPathname);
    };

    if (typeof requestIdleCallback !== 'undefined') {
      idleId = requestIdleCallback(run, { timeout: 3000 });
    } else {
      timeoutId = window.setTimeout(run, 800);
    }

    return () => {
      if (idleId !== undefined && typeof cancelIdleCallback !== 'undefined') {
        cancelIdleCallback(idleId);
      }
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [normalizedPathname, router]);

  const prefetchAdminNavigation = useCallback(
    (href: string) => {
      prefetchAdminRoute(router, href, normalizedPathname);
      warmAdminPageApi(href);
    },
    [normalizedPathname, router],
  );

  const beginAdminNavigation = useCallback(
    (href: string) => {
      setOptimisticPath(normalizeAdminPath(href));
      prefetchAdminNavigation(href);
    },
    [prefetchAdminNavigation],
  );

  const effectivePath = optimisticPath ?? normalizedPathname;

  const value = useMemo(
    () => ({
      effectivePath,
      beginAdminNavigation,
      prefetchAdminNavigation,
      router,
    }),
    [beginAdminNavigation, effectivePath, prefetchAdminNavigation, router],
  );

  return <AdminNavContext.Provider value={value}>{children}</AdminNavContext.Provider>;
}

export function useAdminNav(): AdminNavContextValue {
  const context = useContext(AdminNavContext);
  if (!context) {
    throw new Error('useAdminNav must be used within AdminNavProvider');
  }
  return context;
}
