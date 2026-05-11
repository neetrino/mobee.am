'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useState } from 'react';
import type { AdminMenuItem } from '../../../components/AdminMenuDrawer';
import { getAdminMenuTABS } from '../admin-menu.config';

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
}

function ProductsNavRow({
  tab,
  isActive,
  isExpanded,
  onNavigate,
  onToggleExpand,
  expandAria,
  collapseAria,
}: ProductsNavRowProps) {
  const toggleAriaLabel = isExpanded ? collapseAria : expandAria;
  const containerColors = isActive
    ? 'bg-admin text-white'
    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900';
  const iconColor = isActive ? 'text-white' : 'text-gray-500';

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

interface NavItemButtonProps {
  tab: AdminMenuItem;
  isActive: boolean;
  onNavigate: () => void;
}

function NavItemButton({ tab, isActive, onNavigate }: NavItemButtonProps) {
  return (
    <button
      type="button"
      onClick={onNavigate}
      className={`flex w-full items-center gap-3 rounded-supersudo px-4 py-3 text-left text-sm font-medium transition-all ${
        tab.isSubCategory ? 'pl-12' : ''
      } ${isActive ? 'bg-admin text-white' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
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
}

type PrimaryNavContext = Omit<PrimaryNavListProps, 'primaryTabs'>;

function renderPrimaryNavItem(tab: AdminMenuItem, ctx: PrimaryNavContext) {
  const { currentPath, productGroupActive, isProductsExpanded, setIsProductsExpanded, goTo, t } = ctx;

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
}

/**
 * Shared admin sidebar navigation: primary items and expandable products group.
 */
export function AdminSidebarNavBody({
  currentPath,
  router,
  t,
  onAfterNavigate,
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

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col">
      <div className="admin-sidebar-nav-scroll-desktop min-h-0 flex-1 space-y-1 overflow-y-auto pr-1 lg:pr-0">
        <PrimaryNavList
          primaryTabs={primaryTabs}
          currentPath={currentPath}
          productGroupActive={productGroupActive}
          isProductsExpanded={isProductsExpanded}
          setIsProductsExpanded={setIsProductsExpanded}
          goTo={goTo}
          t={t}
        />
      </div>
    </div>
  );
}
