'use client';

import { useEffect, useState } from 'react';
import { getAdminMenuTABS } from '../admin-menu.config';
import { ADMIN_SIDEBAR_NAV_SCROLL_TOP_PADDING_CLASS } from '../admin-sidebar-layout.constants';
import type { AdminSidebarNavPresentation } from './admin-sidebar-nav.types';
import { isProductGroupPathActive, PrimaryNavList } from './AdminSidebarPrimaryNav';

export type { AdminSidebarNavPresentation } from './admin-sidebar-nav.types';

export interface AdminSidebarNavBodyProps {
  currentPath: string;
  router: ReturnType<typeof import('next/navigation').useRouter>;
  t: (path: string) => string;
  /** Called after a navigation action (e.g. close mobile drawer). */
  onAfterNavigate?: () => void;
  /** `mobileDrawer`: pill rows like storefront Header menu. */
  presentation?: AdminSidebarNavPresentation;
  /** Desktop narrow rail: icons only (labels via tooltip / aria). */
  desktopCollapsed?: boolean;
}

/**
 * Shared admin sidebar navigation: primary items and expandable products group.
 */
export function AdminSidebarNavBody({
  currentPath,
  router,
  t,
  onAfterNavigate,
  presentation = 'desktopSidebar',
  desktopCollapsed,
}: AdminSidebarNavBodyProps) {
  const adminTabs = getAdminMenuTABS(t);
  const primaryTabs = adminTabs.filter((tab) => tab.id !== 'home');
  const productGroupActive = isProductGroupPathActive(currentPath);
  const [isProductsExpanded, setIsProductsExpanded] = useState(productGroupActive);

  useEffect(() => {
    if (productGroupActive) {
      setIsProductsExpanded(true);
    }
  }, [productGroupActive]);

  const goTo = (path: string) => {
    router.push(path);
    onAfterNavigate?.();
  };

  const scrollShellClass =
    presentation === 'mobileDrawer'
      ? 'flex w-full flex-col gap-2'
      : `admin-sidebar-nav-scroll-desktop min-h-0 flex-1 space-y-1 overflow-y-auto pr-1 lg:pr-0 ${ADMIN_SIDEBAR_NAV_SCROLL_TOP_PADDING_CLASS}`;

  const rootClass =
    presentation === 'mobileDrawer'
      ? 'flex w-full flex-col'
      : 'flex h-full min-h-0 w-full flex-1 flex-col';

  return (
    <div className={rootClass}>
      <div className={scrollShellClass}>
        <PrimaryNavList
          primaryTabs={primaryTabs}
          currentPath={currentPath}
          productGroupActive={productGroupActive}
          isProductsExpanded={isProductsExpanded}
          setIsProductsExpanded={setIsProductsExpanded}
          goTo={goTo}
          t={t}
          presentation={presentation}
          desktopCollapsed={desktopCollapsed}
        />
      </div>
    </div>
  );
}
