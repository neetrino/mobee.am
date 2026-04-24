'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../../lib/auth/AuthContext';
import { useTranslation } from '../../../lib/i18n-client';
import { AttributesPageContent } from './AttributesPageContent';
import { AdminPageShell } from '../components/AdminPageShell';

export default function AttributesPage() {
  const { t } = useTranslation();
  const { isLoggedIn, isAdmin, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (!isLoading) {
      if (!isLoggedIn || !isAdmin) {
        router.push('/admin');
      }
    }
  }, [isLoggedIn, isAdmin, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-admin mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">{t('admin.common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn || !isAdmin) {
    return null; // Will redirect
  }

  return (
    <AdminPageShell currentPath={pathname || '/admin/attributes'} router={router} t={t}>
      <div className="max-w-7xl">
        <AttributesPageContent />
      </div>
    </AdminPageShell>
  );
}

