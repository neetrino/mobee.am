'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { Dispatch, SetStateAction } from 'react';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AdminMenuDrawer } from '../../../components/AdminMenuDrawer';
import { SiteBrandLogo } from '../../../components/SiteBrandLogo';
import {
  ADMIN_SIDEBAR_DESKTOP_TOGGLE_COMPACT_CLASS,
  ADMIN_SIDEBAR_DESKTOP_TOGGLE_SQUIRCLE_CLASS,
  ADMIN_SIDEBAR_DESKTOP_WIDTH_FULL_CLASS,
  ADMIN_SIDEBAR_DESKTOP_WIDTH_ICON_RAIL_CLASS,
} from '../admin-sidebar-layout.constants';
import { getAdminMenuTABS } from '../admin-menu.config';
import { AdminSidebarCollapsedHomeMark } from './AdminSidebarCollapsedHomeMark';
import { AdminSidebarNavBody } from './AdminSidebarNavBody';

interface AdminSidebarProps {
  currentPath: string;
  router: ReturnType<typeof useRouter>;
  t: ReturnType<typeof import('../../../lib/i18n-client').useTranslation>['t'];
  desktopCollapsed: boolean;
  onDesktopCollapsedChange: Dispatch<SetStateAction<boolean>>;
}

export function AdminSidebar({
  currentPath,
  router,
  t,
  desktopCollapsed,
  onDesktopCollapsedChange,
}: AdminSidebarProps) {
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
        className={`hidden h-screen flex-shrink-0 lg:sticky lg:top-0 lg:block ${
          desktopCollapsed
            ? ADMIN_SIDEBAR_DESKTOP_WIDTH_ICON_RAIL_CLASS
            : ADMIN_SIDEBAR_DESKTOP_WIDTH_FULL_CLASS
        }`}
      >
        <nav
          className={`flex h-full flex-col overflow-hidden rounded-supersudo border border-gray-200 bg-white ${
            desktopCollapsed ? 'p-1' : 'p-2'
          }`}
        >
          {desktopCollapsed ? (
            <div className="flex shrink-0 flex-col items-center gap-2 border-b border-gray-200 px-1 py-3">
              <Link
                href={siteHomeHref}
                aria-label={t('admin.sidebar.logoLinkAria')}
                className="flex max-w-full justify-center rounded-xl transition-opacity hover:opacity-90 focus-visible:outline focus-visible:ring-2 focus-visible:ring-admin-400 focus-visible:ring-offset-2"
              >
                <AdminSidebarCollapsedHomeMark />
              </Link>
              <button
                type="button"
                onClick={() => {
                  onDesktopCollapsedChange(false);
                }}
                className={ADMIN_SIDEBAR_DESKTOP_TOGGLE_SQUIRCLE_CLASS}
                aria-label={t('admin.sidebar.expandSidebarAria')}
              >
                <ChevronRight className="h-5 w-5" aria-hidden strokeWidth={2} />
              </button>
            </div>
          ) : (
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
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
                  onDesktopCollapsedChange(true);
                }}
                className={ADMIN_SIDEBAR_DESKTOP_TOGGLE_COMPACT_CLASS}
                aria-label={t('admin.sidebar.collapseSidebarAria')}
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden strokeWidth={2} />
              </button>
            </div>
          )}
          <AdminSidebarNavBody
            currentPath={currentPath}
            router={router}
            t={t}
            desktopCollapsed={desktopCollapsed}
          />
        </nav>
      </aside>
    </>
  );
}
