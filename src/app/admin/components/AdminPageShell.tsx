'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AdminSidebar } from './AdminSidebar';

interface AdminPageShellProps {
  currentPath: string;
  router: ReturnType<typeof useRouter>;
  t: ReturnType<typeof import('../../../lib/i18n-client').useTranslation>['t'];
  children: ReactNode;
  mainClassName?: string;
}

export function AdminPageShell({
  currentPath,
  router,
  t,
  children,
  mainClassName,
}: AdminPageShellProps) {
  return (
    <div className="min-h-screen bg-[#F2F5F8]">
      <div className="flex flex-col lg:flex-row gap-8">
        <AdminSidebar currentPath={currentPath} router={router} t={t} />
        <div className={`flex-1 min-w-0 px-4 sm:px-6 lg:px-8 ${mainClassName ?? ''}`.trim()}>{children}</div>
      </div>
    </div>
  );
}
