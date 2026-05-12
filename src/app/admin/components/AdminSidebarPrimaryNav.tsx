'use client';

import type { Dispatch, SetStateAction } from 'react';
import type { AdminMenuItem } from '../../../components/AdminMenuDrawer';
import {
  MOBILE_DRAWER_ADMIN_MENU_ITEM_ACTIVE_CLASS,
  MOBILE_DRAWER_ADMIN_MENU_ITEM_CLASS,
  MOBILE_DRAWER_ADMIN_NAV_LABEL_CLASS,
  MOBILE_DRAWER_ADMIN_SUBMENU_HORIZONTAL_TRIM_CLASS,
} from '../../../components/mobile-drawer-nav.constants';
import type { AdminSidebarNavPresentation } from './admin-sidebar-nav.types';
import { ProductsNavRow } from './AdminSidebarProductsNavRow';

function rowChevronRightClassName(isActive: boolean): string {
  return isActive ? 'text-white/90' : 'text-gray-400';
}

const PRODUCT_SUBMENU_IDS = new Set(['categories', 'brands', 'attributes']);

export const PRODUCT_GROUP_PATHS = [
  '/supersudo/products',
  '/supersudo/categories',
  '/supersudo/brands',
  '/supersudo/attributes',
] as const;

export function isProductGroupPathActive(currentPath: string): boolean {
  return PRODUCT_GROUP_PATHS.some((path) => currentPath.startsWith(path));
}

function isTabActive(tab: AdminMenuItem, currentPath: string, productGroupActive: boolean): boolean {
  const isRootTab = tab.path === '/';
  if (isRootTab) {
    return currentPath === '/';
  }
  return (
    currentPath === tab.path ||
    (tab.path === '/supersudo' && currentPath === '/supersudo') ||
    (tab.path !== '/supersudo' && currentPath.startsWith(tab.path)) ||
    (tab.id === 'products' && productGroupActive)
  );
}

interface NavItemButtonProps {
  tab: AdminMenuItem;
  isActive: boolean;
  onNavigate: () => void;
  presentation: AdminSidebarNavPresentation;
  desktopCollapsed?: boolean;
}

function NavItemButton({ tab, isActive, onNavigate, presentation, desktopCollapsed }: NavItemButtonProps) {
  const rowClass = isActive ? MOBILE_DRAWER_ADMIN_MENU_ITEM_ACTIVE_CLASS : MOBILE_DRAWER_ADMIN_MENU_ITEM_CLASS;
  const subTrimClass = tab.isSubCategory ? MOBILE_DRAWER_ADMIN_SUBMENU_HORIZONTAL_TRIM_CLASS : '';

  if (presentation === 'mobileDrawer') {
    return (
      <button type="button" onClick={onNavigate} className={`${rowClass} ${subTrimClass}`.trim()}>
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
      </button>
    );
  }

  if (desktopCollapsed) {
    return (
      <button
        type="button"
        onClick={onNavigate}
        title={tab.label}
        aria-label={tab.label}
        className={`flex w-full items-center justify-center rounded-supersudo px-2 py-3 text-sm font-medium transition-all ${subTrimClass} ${
          isActive ? 'bg-admin text-white' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
        }`.trim()}
      >
        <span className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-500'}`}>{tab.icon}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onNavigate}
      className={`flex w-full items-center gap-3 rounded-supersudo px-4 py-3 text-left text-sm font-medium transition-all ${subTrimClass} ${
        isActive ? 'bg-admin text-white' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
      }`.trim()}
    >
      <span className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-500'}`}>{tab.icon}</span>
      <span>{tab.label}</span>
    </button>
  );
}

export interface PrimaryNavListProps {
  primaryTabs: AdminMenuItem[];
  currentPath: string;
  productGroupActive: boolean;
  isProductsExpanded: boolean;
  setIsProductsExpanded: Dispatch<SetStateAction<boolean>>;
  goTo: (path: string) => void;
  t: (path: string) => string;
  presentation: AdminSidebarNavPresentation;
  desktopCollapsed?: boolean;
}

type PrimaryNavContext = Omit<PrimaryNavListProps, 'primaryTabs'>;

function renderPrimaryNavItem(tab: AdminMenuItem, ctx: PrimaryNavContext) {
  const {
    currentPath,
    productGroupActive,
    isProductsExpanded,
    setIsProductsExpanded,
    goTo,
    t,
    presentation,
    desktopCollapsed,
  } = ctx;

  if (tab.isSubCategory && (!isProductsExpanded || desktopCollapsed)) {
    return null;
  }

  const isActive = isTabActive(tab, currentPath, productGroupActive);

  if (tab.id === 'products') {
    return (
      <ProductsNavRow
        key={tab.id}
        tab={tab}
        isActive={isActive}
        isExpanded={isProductsExpanded}
        onNavigate={() => {
          goTo(tab.path);
        }}
        onToggleExpand={() => {
          setIsProductsExpanded((prev) => !prev);
        }}
        expandAria={t('admin.sidebar.expandProductsMenu')}
        collapseAria={t('admin.sidebar.collapseProductsMenu')}
        presentation={presentation}
        iconRail={presentation === 'desktopSidebar' && Boolean(desktopCollapsed)}
      />
    );
  }

  if (tab.isSubCategory && !PRODUCT_SUBMENU_IDS.has(tab.id)) {
    return null;
  }

  return (
    <NavItemButton
      key={tab.id}
      tab={tab}
      isActive={isActive}
      onNavigate={() => {
        goTo(tab.path);
      }}
      presentation={presentation}
      desktopCollapsed={desktopCollapsed}
    />
  );
}

export function PrimaryNavList({ primaryTabs, ...ctx }: PrimaryNavListProps) {
  return primaryTabs.map((tab) => renderPrimaryNavItem(tab, ctx));
}
