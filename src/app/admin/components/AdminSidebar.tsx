'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AdminMenuDrawer } from '../../../components/AdminMenuDrawer';
import { SiteBrandLogo } from '../../../components/SiteBrandLogo';
import { getAdminMenuTABS } from '../admin-menu.config';
import { AdminSidebarHomeLanguageBlock, useAdminSidebarLanguage } from './AdminSidebarHomeLanguage';
import { AdminSidebarNavBody } from './AdminSidebarNavBody';

interface AdminSidebarProps {
  currentPath: string;
  router: ReturnType<typeof useRouter>;
  t: ReturnType<typeof import('../../../lib/i18n-client').useTranslation>['t'];
}

export function AdminSidebar({ currentPath, router, t }: AdminSidebarProps) {
  const headerTitle = t('admin.dashboard.title');
  const homeTab = useMemo(() => getAdminMenuTABS(t).find((tab) => tab.id === 'home'), [t]);
  const mobileLanguage = useAdminSidebarLanguage();

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 lg:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <AdminMenuDrawer
            renderNav={(onAfterNavigate) => (
              <AdminSidebarNavBody
                currentPath={currentPath}
                router={router}
                t={t}
                onAfterNavigate={onAfterNavigate}
              />
            )}
            logoLinkAria={t('admin.sidebar.logoLinkAria')}
            siteLogoAlt={t('common.ariaLabels.siteLogo')}
            headerTitle={headerTitle}
            drawerMenuButton={t('admin.sidebar.drawerMenuButton')}
            closeMenuAria={t('common.ariaLabels.closeMenu')}
          />
          {homeTab ? (
            <AdminSidebarHomeLanguageBlock
              layout="toolbar"
              homeTab={homeTab}
              currentPath={currentPath}
              currentLanguage={mobileLanguage}
              onGoHome={() => {
                router.push(homeTab.path);
              }}
            />
          ) : null}
        </div>
      </div>
      <aside className="hidden h-screen w-64 flex-shrink-0 lg:sticky lg:top-0 lg:block">
        <nav className="flex h-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white p-2">
          <div className="flex shrink-0 items-center gap-3 border-b border-gray-200 px-4 py-3">
            <Link
              href="/supersudo"
              aria-label={t('admin.sidebar.logoLinkAria')}
              className="flex min-w-0 max-w-[160px] shrink-0 transition-opacity hover:opacity-90"
            >
              <SiteBrandLogo decorative alt={t('common.ariaLabels.siteLogo')} heightClass="h-8" />
            </Link>
            <div className="min-w-0 flex-1 text-sm font-semibold text-gray-900">{headerTitle}</div>
          </div>
          <AdminSidebarNavBody currentPath={currentPath} router={router} t={t} />
        </nav>
      </aside>
    </>
  );
}
