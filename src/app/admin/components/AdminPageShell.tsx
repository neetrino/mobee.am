'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ADMIN_PAGE_MAIN_COLLAPSED_MAX_WIDTH_CLASS,
  ADMIN_PAGE_MAIN_EXPANDED_SHIFT_LEFT_CLASS,
} from '../admin-sidebar-layout.constants';
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
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);

  const mainHorizontalPaddingClass = desktopSidebarCollapsed
    ? 'px-4 pt-2 sm:px-6 sm:pt-4 lg:px-0 lg:pt-[30px]'
    : 'px-4 pt-2 sm:px-6 sm:pt-4 lg:px-8 lg:pt-[30px]';

  const mainExpandedShiftClass = desktopSidebarCollapsed ? '' : ADMIN_PAGE_MAIN_EXPANDED_SHIFT_LEFT_CLASS;

  return (
    <div className="min-h-screen bg-[#F2F5F8]">
      <div className="flex flex-col gap-4 lg:flex-row lg:gap-8">
        <AdminSidebar
          currentPath={currentPath}
          router={router}
          t={t}
          desktopCollapsed={desktopSidebarCollapsed}
          onDesktopCollapsedChange={setDesktopSidebarCollapsed}
        />
        <div
          className={`flex-1 min-w-0 ${mainHorizontalPaddingClass} ${mainExpandedShiftClass} ${
            desktopSidebarCollapsed ? '' : (mainClassName ?? '')
          }`.trim()}
        >
          {desktopSidebarCollapsed ? (
            <div className={`${ADMIN_PAGE_MAIN_COLLAPSED_MAX_WIDTH_CLASS} ${mainClassName ?? ''}`.trim()}>
              {children}
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}
