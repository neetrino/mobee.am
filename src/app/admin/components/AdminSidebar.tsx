'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useMemo } from 'react';
import { adminNavMarkMount } from '@/lib/admin/admin-nav-debug';
import { useRouter } from 'next/navigation';
import { AdminMenuDrawer } from '../../../components/AdminMenuDrawer';
import { SiteBrandLogo } from '../../../components/SiteBrandLogo';
import {
  ADMIN_SIDEBAR_DESKTOP_TOGGLE_COMPACT_CLASS,
  ADMIN_SIDEBAR_DESKTOP_TOGGLE_SQUIRCLE_CLASS,
  ADMIN_SIDEBAR_DESKTOP_WIDTH_FULL_CLASS,
  ADMIN_SIDEBAR_DESKTOP_WIDTH_ICON_RAIL_CLASS,
  ADMIN_SIDEBAR_DESKTOP_WIDTH_TRANSITION_CLASS,
  ADMIN_SIDEBAR_HEADER_FADE_TRANSITION_CLASS,
  ADMIN_SIDEBAR_NAV_SHELL_TRANSITION_CLASS,
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
  useEffect(() => adminNavMarkMount('AdminSidebar'), []);

  const menuTabs = useMemo(() => getAdminMenuTABS(t), [t]);
  const siteHomeHref = useMemo(
    () => menuTabs.find((tab) => tab.id === 'home')?.path ?? '/',
    [menuTabs],
  );

  const toggleDesktopSidebar = () => {
    onDesktopCollapsedChange((prev) => !prev);
  };

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
        className={`hidden h-screen flex-shrink-0 overflow-hidden lg:sticky lg:top-0 lg:block ${ADMIN_SIDEBAR_DESKTOP_WIDTH_TRANSITION_CLASS} ${
          desktopCollapsed
            ? ADMIN_SIDEBAR_DESKTOP_WIDTH_ICON_RAIL_CLASS
            : ADMIN_SIDEBAR_DESKTOP_WIDTH_FULL_CLASS
        }`}
      >
        <nav
          className={`flex h-full flex-col overflow-hidden rounded-supersudo border border-gray-200 bg-white ${ADMIN_SIDEBAR_NAV_SHELL_TRANSITION_CLASS} ${
            desktopCollapsed ? 'p-1' : 'p-2'
          }`}
        >
          <div
            className={`flex shrink-0 items-center border-b border-gray-200 transition-all duration-300 ease-in-out motion-reduce:transition-none ${
              desktopCollapsed ? 'flex-col gap-2 px-1 py-3' : 'justify-between gap-3 px-4 py-3'
            }`}
          >
            <div
              className={`relative flex h-10 items-center min-w-0 ${
                desktopCollapsed ? 'w-full justify-center' : 'shrink-0'
              }`}
            >
              <Link
                href={siteHomeHref}
                aria-label={t('admin.sidebar.logoLinkAria')}
                className={`${ADMIN_SIDEBAR_HEADER_FADE_TRANSITION_CLASS} flex max-w-[160px] shrink-0 items-center ${
                  desktopCollapsed
                    ? 'pointer-events-none absolute inset-x-0 mx-auto justify-center opacity-0 scale-90'
                    : 'opacity-100 scale-100'
                }`}
              >
                <SiteBrandLogo decorative alt={t('common.ariaLabels.siteLogo')} heightClass="h-8" />
              </Link>
              <Link
                href={siteHomeHref}
                aria-label={t('admin.sidebar.logoLinkAria')}
                className={`${ADMIN_SIDEBAR_HEADER_FADE_TRANSITION_CLASS} flex justify-center rounded-xl focus-visible:outline focus-visible:ring-2 focus-visible:ring-admin-400 focus-visible:ring-offset-2 ${
                  desktopCollapsed
                    ? 'opacity-100 scale-100 hover:opacity-90'
                    : 'pointer-events-none absolute inset-x-0 mx-auto justify-center opacity-0 scale-90'
                }`}
              >
                <AdminSidebarCollapsedHomeMark />
              </Link>
            </div>
            <button
              type="button"
              onClick={toggleDesktopSidebar}
              className={`transition-all duration-300 ease-in-out motion-reduce:transition-none ${
                desktopCollapsed
                  ? ADMIN_SIDEBAR_DESKTOP_TOGGLE_SQUIRCLE_CLASS
                  : ADMIN_SIDEBAR_DESKTOP_TOGGLE_COMPACT_CLASS
              }`}
              aria-label={
                desktopCollapsed
                  ? t('admin.sidebar.expandSidebarAria')
                  : t('admin.sidebar.collapseSidebarAria')
              }
            >
              {desktopCollapsed ? (
                <ChevronRight className="h-5 w-5" aria-hidden strokeWidth={2} />
              ) : (
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden strokeWidth={2} />
              )}
            </button>
          </div>
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
