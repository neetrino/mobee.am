'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { useTranslation } from '@/lib/i18n-client';
import { preloadAdminNamespaces } from '@/lib/i18n-lazy-loader';
import { useUiLanguage } from '@/components/UiLanguageProvider';
import { adminNavMarkMount } from '@/lib/admin/admin-nav-debug';
import { AdminPageShell } from './AdminPageShell';

const ADMIN_DASHBOARD_PATHS = new Set(['/supersudo', '/admin']);

function resolveAdminMainClassName(pathname: string | null): string | undefined {
  if (!pathname) {
    return 'max-w-7xl';
  }
  if (ADMIN_DASHBOARD_PATHS.has(pathname)) {
    return 'max-w-7xl';
  }
  return undefined;
}

interface AdminLayoutClientProps {
  children: ReactNode;
}

/**
 * Shared admin shell: auth gate + persistent sidebar across client navigations.
 */
export function AdminLayoutClient({ children }: AdminLayoutClientProps) {
  const { t } = useTranslation();
  const lang = useUiLanguage();
  const { isLoggedIn, isAdmin, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => adminNavMarkMount('AdminLayoutClient'), []);

  useEffect(() => {
    void preloadAdminNamespaces(lang);
  }, [lang]);

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }
    if (!isAdmin) {
      router.push('/');
    }
  }, [isLoggedIn, isAdmin, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-admin" />
          <p className="text-gray-600">{t('admin.common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn || !isAdmin) {
    return null;
  }

  return (
    <AdminPageShell
      currentPath={pathname || '/supersudo'}
      router={router}
      t={t}
      mainClassName={resolveAdminMainClassName(pathname)}
    >
      {children}
    </AdminPageShell>
  );
}
