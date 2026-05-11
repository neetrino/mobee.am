'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminMenuDrawer } from '../../../components/AdminMenuDrawer';
import { SiteBrandLogo } from '../../../components/SiteBrandLogo';
import { getAdminMenuTABS } from '../admin-menu.config';
import { AdminSidebarNavBody } from './AdminSidebarNavBody';

interface AdminSidebarProps {
  currentPath: string;
  router: ReturnType<typeof useRouter>;
  t: ReturnType<typeof import('../../../lib/i18n-client').useTranslation>['t'];
}

export function AdminSidebar({ currentPath, router, t }: AdminSidebarProps) {
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const siteHomeHref = useMemo(
    () => getAdminMenuTABS(t).find((tab) => tab.id === 'home')?.path ?? '/',
    [t],
  );

  return (
    <>
      <div className="mb-2 mt-admin-mobile-menu-top ml-admin-mobile-menu-left flex flex-col gap-3 lg:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <AdminMenuDrawer
            renderNav={(onAfterNavigate) => (
              <AdminSidebarNavBody
                currentPath={currentPath}
                router={router}
                t={t}
                onAfterNavigate={onAfterNavigate}
                presentation="mobileDrawer"
              />
            )}
            logoHref={siteHomeHref}
            logoLinkAria={t('admin.sidebar.logoLinkAria')}
            siteLogoAlt={t('common.ariaLabels.siteLogo')}
            drawerTitle={t('admin.sidebar.drawerTitle')}
            drawerMenuButton={t('admin.sidebar.drawerMenuButton')}
            closeMenuAria={t('common.ariaLabels.closeMenu')}
          />
        </div>
      </div>
      <aside
        className={
          isDesktopSidebarCollapsed
            ? 'hidden'
            : 'hidden h-screen w-64 flex-shrink-0 lg:sticky lg:top-0 lg:block'
        }
      >
        <nav className="flex h-full flex-col overflow-hidden rounded-supersudo border border-gray-200 bg-white p-2">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 px-4 py-3">
            <Link
              href={siteHomeHref}
              aria-label={t('admin.sidebar.logoLinkAria')}
              className="flex min-w-0 max-w-[160px] shrink-0 transition-opacity hover:opacity-90"
            >
              <SiteBrandLogo decorative alt={t('common.ariaLabels.siteLogo')} heightClass="h-8" />
            </Link>
            <button
              type="button"
              onClick={() => {
                setIsDesktopSidebarCollapsed(true);
              }}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900"
              aria-label={t('admin.sidebar.collapseSidebarAria')}
            >
              <ChevronLeft className="h-5 w-5" aria-hidden strokeWidth={2} />
            </button>
          </div>
          <AdminSidebarNavBody currentPath={currentPath} router={router} t={t} />
        </nav>
      </aside>
      {isDesktopSidebarCollapsed ? (
        <button
          type="button"
          onClick={() => {
            setIsDesktopSidebarCollapsed(false);
          }}
          className="fixed left-0 top-24 z-40 hidden h-12 w-10 items-center justify-center rounded-r-supersudo border border-l-0 border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 lg:inline-flex"
          aria-label={t('admin.sidebar.expandSidebarAria')}
        >
          <ChevronRight className="h-5 w-5" aria-hidden strokeWidth={2} />
        </button>
      ) : null}
    </>
  );
}
