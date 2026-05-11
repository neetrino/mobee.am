'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useState } from 'react';
import type { AdminMenuItem } from '../../../components/AdminMenuDrawer';
import {
  MOBILE_DRAWER_ADMIN_MENU_ITEM_ACTIVE_CLASS,
  MOBILE_DRAWER_ADMIN_MENU_ITEM_CLASS,
  MOBILE_DRAWER_ADMIN_NAV_LABEL_CLASS,
  MOBILE_DRAWER_ADMIN_SUBMENU_HORIZONTAL_TRIM_CLASS,
} from '../../../components/mobile-drawer-nav.constants';
import { getAdminMenuTABS } from '../admin-menu.config';

export type AdminSidebarNavPresentation = 'desktopSidebar' | 'mobileDrawer';

function rowChevronRightClassName(isActive: boolean): string {
  return isActive ? 'text-white/90' : 'text-gray-400';
}

const PRODUCT_SUBMENU_IDS = new Set(['categories', 'brands', 'attributes']);
const PRODUCT_GROUP_PATHS = [
  '/supersudo/products',
  '/supersudo/categories',
  '/supersudo/brands',
  '/supersudo/attributes',
] as const;

function isProductGroupPathActive(currentPath: string): boolean {
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

interface ProductsNavRowProps {
  tab: AdminMenuItem;
  isActive: boolean;
  isExpanded: boolean;
  onNavigate: () => void;
  onToggleExpand: () => void;
  expandAria: string;
  collapseAria: string;
  presentation: AdminSidebarNavPresentation;
}

type ProductsNavRowBranchProps = Pick<
  ProductsNavRowProps,
  'tab' | 'isActive' | 'isExpanded' | 'onNavigate' | 'onToggleExpand'
> & { toggleAriaLabel: string };

function ProductsNavRowMobile({
  tab,
  isActive,
  isExpanded,
  onNavigate,
  onToggleExpand,
  toggleAriaLabel,
}: ProductsNavRowBranchProps) {
  const outer = isActive
    ? 'border-admin-500 bg-admin-500 text-white'
    : 'border-gray-200 bg-white text-gray-800 shadow-sm transition-colors hover:border-admin-300 hover:bg-admin-50';
  const divider = isActive ? 'border-white/20' : 'border-gray-200';
  const iconColorMobile = isActive ? 'text-white' : 'text-gray-600';

  return (
    <div className={`flex w-full min-w-0 overflow-hidden rounded-2xl border text-sm font-medium ${outer}`}>
      <button
        type="button"
        onClick={onNavigate}
        className={`flex min-w-0 flex-1 items-center justify-start gap-3 px-4 py-3 text-left ${!isActive ? 'text-gray-800' : ''}`}
      >
        <span className={`flex-shrink-0 ${iconColorMobile}`}>{tab.icon}</span>
        <span className={`${MOBILE_DRAWER_ADMIN_NAV_LABEL_CLASS} truncate`}>{tab.label}</span>
      </button>
      <button
        type="button"
        onClick={onToggleExpand}
        aria-expanded={isExpanded}
        aria-label={`${tab.label}. ${toggleAriaLabel}`}
        aria-controls="admin-products-submenu"
        className={`flex shrink-0 items-center justify-center border-l px-3 py-3 ${divider}`}
      >
        <svg
          className={`h-4 w-4 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''} ${isActive ? 'text-white' : 'text-gray-500'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  );
}

function ProductsNavRowDesktop({
  tab,
  isActive,
  isExpanded,
  onNavigate,
  onToggleExpand,
  toggleAriaLabel,
}: ProductsNavRowBranchProps) {
  const iconColor = isActive ? 'text-white' : 'text-gray-500';
  const containerColors = isActive
    ? 'bg-admin text-white'
    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900';

  return (
    <div
      className={`flex w-full min-w-0 items-stretch rounded-supersudo text-sm font-medium transition-all ${containerColors}`}
    >
      <button
        type="button"
        onClick={onNavigate}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-l-supersudo px-4 py-3 text-left"
      >
        <span className={`flex-shrink-0 ${iconColor}`}>{tab.icon}</span>
        <span className="min-w-0 flex-1 truncate">{tab.label}</span>
      </button>
      <button
        type="button"
        onClick={onToggleExpand}
        aria-expanded={isExpanded}
        aria-label={`${tab.label}. ${toggleAriaLabel}`}
        aria-controls="admin-products-submenu"
        className="flex shrink-0 items-center justify-center rounded-r-supersudo px-3 py-3"
      >
        <svg
          className={`h-4 w-4 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''} ${iconColor}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  );
}

function ProductsNavRow(props: ProductsNavRowProps) {
  const { presentation, expandAria, collapseAria, ...rest } = props;
  const toggleAriaLabel = props.isExpanded ? collapseAria : expandAria;
  const shared = { ...rest, toggleAriaLabel };

  if (presentation === 'mobileDrawer') {
    return <ProductsNavRowMobile {...shared} />;
  }
  return <ProductsNavRowDesktop {...shared} />;
}

interface NavItemButtonProps {
  tab: AdminMenuItem;
  isActive: boolean;
  onNavigate: () => void;
  presentation: AdminSidebarNavPresentation;
}

function NavItemButton({ tab, isActive, onNavigate, presentation }: NavItemButtonProps) {
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

interface PrimaryNavListProps {
  primaryTabs: AdminMenuItem[];
  currentPath: string;
  productGroupActive: boolean;
  isProductsExpanded: boolean;
  setIsProductsExpanded: Dispatch<SetStateAction<boolean>>;
  goTo: (path: string) => void;
  t: (path: string) => string;
  presentation: AdminSidebarNavPresentation;
}

type PrimaryNavContext = Omit<PrimaryNavListProps, 'primaryTabs'>;

function renderPrimaryNavItem(tab: AdminMenuItem, ctx: PrimaryNavContext) {
  const { currentPath, productGroupActive, isProductsExpanded, setIsProductsExpanded, goTo, t, presentation } = ctx;

  if (tab.isSubCategory && !isProductsExpanded) {
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
    />
  );
}

function PrimaryNavList({ primaryTabs, ...ctx }: PrimaryNavListProps) {
  return primaryTabs.map((tab) => renderPrimaryNavItem(tab, ctx));
}

export interface AdminSidebarNavBodyProps {
  currentPath: string;
  router: ReturnType<typeof import('next/navigation').useRouter>;
  t: (path: string) => string;
  /** Called after a navigation action (e.g. close mobile drawer). */
  onAfterNavigate?: () => void;
  /** `mobileDrawer`: pill rows like storefront Header menu. */
  presentation?: AdminSidebarNavPresentation;
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
      : 'admin-sidebar-nav-scroll-desktop min-h-0 flex-1 space-y-1 overflow-y-auto pr-1 lg:pr-0';

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
        />
      </div>
    </div>
  );
}
