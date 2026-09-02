'use client';

import type { Dispatch, SetStateAction } from 'react';
import type { AdminMenuItem } from '../../../components/AdminMenuDrawer';
import {
  MOBILE_DRAWER_ADMIN_MENU_ITEM_ACTIVE_CLASS,
  MOBILE_DRAWER_ADMIN_MENU_ITEM_CLASS,
  MOBILE_DRAWER_ADMIN_NAV_LABEL_CLASS,
  MOBILE_DRAWER_ADMIN_SUBMENU_HORIZONTAL_TRIM_CLASS,
} from '../../../components/mobile-drawer-nav.constants';
import {
  ADMIN_SIDEBAR_LABEL_COLLAPSE_TRANSITION_CLASS,
  ADMIN_SIDEBAR_NAV_ACTIVE_TEXT_CLASS,
  ADMIN_SIDEBAR_NAV_ICON_ACTIVE_CLASS,
  ADMIN_SIDEBAR_NAV_ICON_INACTIVE_CLASS,
  ADMIN_SIDEBAR_NAV_INACTIVE_ROW_CLASS,
  ADMIN_SIDEBAR_NAV_ROW_BASE_CLASS,
} from '../admin-sidebar-layout.constants';
import type { AdminSidebarNavPresentation } from './admin-sidebar-nav.types';
import { AdminSidebarNavLink } from './AdminSidebarNavLink';
import { ProductsNavRow } from './AdminSidebarProductsNavRow';
import styles from './AdminSidebarNav.module.css';

function rowChevronRightClassName(isActive: boolean): string {
  return isActive ? 'text-white/90' : 'text-gray-400';
}

export const PRODUCT_GROUP_PATHS = [
  '/supersudo/products',
  '/supersudo/categories',
  '/supersudo/brands',
  '/supersudo/attributes',
] as const;

export const PRODUCT_SUBMENU_IDS = new Set(['categories', 'brands', 'attributes']);

export function isProductGroupPathActive(currentPath: string): boolean {
  return PRODUCT_GROUP_PATHS.some((path) => currentPath.startsWith(path));
}

export function isTabActive(tab: AdminMenuItem, currentPath: string): boolean {
  const isRootTab = tab.path === '/';
  if (isRootTab) {
    return currentPath === '/';
  }
  if (tab.id === 'products') {
    return (
      currentPath === '/supersudo/products' || currentPath.startsWith('/supersudo/products/')
    );
  }
  return (
    currentPath === tab.path ||
    (tab.path === '/supersudo' && currentPath === '/supersudo') ||
    (tab.path !== '/supersudo' && currentPath.startsWith(tab.path))
  );
}

export function isNavRowVisible(
  tab: AdminMenuItem,
  isProductsExpanded: boolean,
  desktopCollapsed: boolean,
): boolean {
  if (tab.isSubCategory && (!isProductsExpanded || desktopCollapsed)) {
    return false;
  }
  return true;
}

interface NavItemLinkProps {
  tab: AdminMenuItem;
  isActive: boolean;
  presentation: AdminSidebarNavPresentation;
  desktopCollapsed?: boolean;
  onAfterNavigate?: () => void;
  setRowRef?: (node: HTMLElement | null) => void;
  useSlidingIndicator?: boolean;
}

function NavItemLink({
  tab,
  isActive,
  presentation,
  desktopCollapsed,
  onAfterNavigate,
  setRowRef,
  useSlidingIndicator = false,
}: NavItemLinkProps) {
  const rowClass = isActive ? MOBILE_DRAWER_ADMIN_MENU_ITEM_ACTIVE_CLASS : MOBILE_DRAWER_ADMIN_MENU_ITEM_CLASS;
  const subTrimClass = tab.isSubCategory ? MOBILE_DRAWER_ADMIN_SUBMENU_HORIZONTAL_TRIM_CLASS : '';

  if (presentation === 'mobileDrawer') {
    return (
      <AdminSidebarNavLink
        href={tab.path}
        onAfterNavigate={onAfterNavigate}
        className={`${rowClass} ${subTrimClass}`.trim()}
      >
        <span className="flex min-w-0 flex-1 items-center justify-start gap-3 text-left">
          <span className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-600'}`}>{tab.icon}</span>
          <span className={MOBILE_DRAWER_ADMIN_NAV_LABEL_CLASS}>{tab.label}</span>
        </span>
        <svg
          className={`h-4 w-4 shrink-0 ${rowChevronRightClassName(isActive)}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </AdminSidebarNavLink>
    );
  }

  const collapsedRail = presentation === 'desktopSidebar' && Boolean(desktopCollapsed);

  if (useSlidingIndicator) {
    const iconTone = isActive
      ? ADMIN_SIDEBAR_NAV_ICON_ACTIVE_CLASS
      : ADMIN_SIDEBAR_NAV_ICON_INACTIVE_CLASS;
    const labelTone = isActive ? ADMIN_SIDEBAR_NAV_ACTIVE_TEXT_CLASS : 'text-inherit';
    const subIndent = tab.isSubCategory && !collapsedRail ? 'pl-12' : '';

    return (
      <AdminSidebarNavLink
        ref={setRowRef}
        href={tab.path}
        onAfterNavigate={onAfterNavigate}
        title={collapsedRail ? tab.label : undefined}
        aria-label={collapsedRail ? tab.label : undefined}
        aria-current={isActive ? 'page' : undefined}
        className={`${ADMIN_SIDEBAR_NAV_ROW_BASE_CLASS} ${
          collapsedRail ? 'justify-center px-2 py-3' : `gap-3 px-4 py-3 text-left ${subIndent}`
        } ${isActive ? '' : ADMIN_SIDEBAR_NAV_INACTIVE_ROW_CLASS} ${subTrimClass}`.trim()}
      >
        <span className={`flex-shrink-0 ${iconTone}`}>{tab.icon}</span>
        <span
          className={`${styles.tabLabel} truncate font-medium ${labelTone} ${ADMIN_SIDEBAR_LABEL_COLLAPSE_TRANSITION_CLASS} ${
            collapsedRail ? 'max-w-0 opacity-0' : 'max-w-[12rem] opacity-100'
          }`}
        >
          {tab.label}
        </span>
      </AdminSidebarNavLink>
    );
  }

  return (
    <AdminSidebarNavLink
      href={tab.path}
      onAfterNavigate={onAfterNavigate}
      title={collapsedRail ? tab.label : undefined}
      aria-label={collapsedRail ? tab.label : undefined}
      className={`flex w-full items-center rounded-supersudo py-3 text-sm font-medium transition-all duration-300 ease-in-out motion-reduce:transition-none ${subTrimClass} ${
        collapsedRail ? 'justify-center px-2' : 'gap-3 px-4 text-left'
      } ${isActive ? 'bg-admin text-white' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`.trim()}
    >
      <span className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-500'}`}>{tab.icon}</span>
      <span
        className={`truncate ${ADMIN_SIDEBAR_LABEL_COLLAPSE_TRANSITION_CLASS} ${
          collapsedRail ? 'max-w-0 opacity-0' : 'max-w-[12rem] opacity-100'
        }`}
      >
        {tab.label}
      </span>
    </AdminSidebarNavLink>
  );
}

export interface PrimaryNavListProps {
  primaryTabs: AdminMenuItem[];
  currentPath: string;
  productGroupActive: boolean;
  isProductsExpanded: boolean;
  setIsProductsExpanded: Dispatch<SetStateAction<boolean>>;
  t: (path: string) => string;
  presentation: AdminSidebarNavPresentation;
  desktopCollapsed?: boolean;
  onAfterNavigate?: () => void;
}

type PrimaryNavContext = PrimaryNavListProps & {
  setRowRef?: (id: string, node: HTMLElement | null) => void;
  useSlidingIndicator?: boolean;
};

export function renderPrimaryNavItem(tab: AdminMenuItem, ctx: PrimaryNavContext) {
  const {
    currentPath,
    isProductsExpanded,
    setIsProductsExpanded,
    t,
    presentation,
    desktopCollapsed,
    onAfterNavigate,
    setRowRef,
    useSlidingIndicator,
  } = ctx;

  if (!isNavRowVisible(tab, isProductsExpanded, Boolean(desktopCollapsed))) {
    return null;
  }

  const isActive = isTabActive(tab, currentPath);
  const bindRowRef = setRowRef ? (node: HTMLElement | null) => setRowRef(tab.id, node) : undefined;

  if (tab.id === 'products') {
    return (
      <ProductsNavRow
        key={tab.id}
        tab={tab}
        isActive={isActive}
        isExpanded={isProductsExpanded}
        onToggleExpand={() => {
          setIsProductsExpanded((prev) => !prev);
        }}
        expandAria={t('admin.sidebar.expandProductsMenu')}
        collapseAria={t('admin.sidebar.collapseProductsMenu')}
        presentation={presentation}
        iconRail={presentation === 'desktopSidebar' && Boolean(desktopCollapsed)}
        onAfterNavigate={onAfterNavigate}
        setRowRef={bindRowRef}
        useSlidingIndicator={useSlidingIndicator}
      />
    );
  }

  if (tab.isSubCategory && !PRODUCT_SUBMENU_IDS.has(tab.id)) {
    return null;
  }

  return (
    <NavItemLink
      key={tab.id}
      tab={tab}
      isActive={isActive}
      presentation={presentation}
      desktopCollapsed={desktopCollapsed}
      onAfterNavigate={onAfterNavigate}
      setRowRef={bindRowRef}
      useSlidingIndicator={useSlidingIndicator}
    />
  );
}
