'use client';

import type { AdminMenuItem } from '../../../components/AdminMenuDrawer';
import { MOBILE_DRAWER_ADMIN_NAV_LABEL_CLASS } from '../../../components/mobile-drawer-nav.constants';
import type { AdminSidebarNavPresentation } from './admin-sidebar-nav.types';

export interface ProductsNavRowProps {
  tab: AdminMenuItem;
  isActive: boolean;
  isExpanded: boolean;
  onNavigate: () => void;
  onToggleExpand: () => void;
  expandAria: string;
  collapseAria: string;
  presentation: AdminSidebarNavPresentation;
  /** Narrow desktop rail: icon only, no submenu toggle. */
  iconRail?: boolean;
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

function ProductsNavRowDesktopIconRail({
  tab,
  isActive,
  onNavigate,
}: Pick<ProductsNavRowBranchProps, 'tab' | 'isActive' | 'onNavigate'>) {
  const iconColor = isActive ? 'text-white' : 'text-gray-500';
  const containerColors = isActive
    ? 'bg-admin text-white'
    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900';

  return (
    <button
      type="button"
      onClick={onNavigate}
      title={tab.label}
      aria-label={tab.label}
      className={`flex w-full items-center justify-center rounded-supersudo p-3 text-sm font-medium transition-all ${containerColors}`}
    >
      <span className={`flex-shrink-0 ${iconColor}`}>{tab.icon}</span>
    </button>
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

export function ProductsNavRow(props: ProductsNavRowProps) {
  const { presentation, expandAria, collapseAria, iconRail, ...rest } = props;
  const toggleAriaLabel = props.isExpanded ? collapseAria : expandAria;
  const shared = { ...rest, toggleAriaLabel };

  if (iconRail && presentation === 'desktopSidebar') {
    return <ProductsNavRowDesktopIconRail tab={shared.tab} isActive={shared.isActive} onNavigate={shared.onNavigate} />;
  }

  if (presentation === 'mobileDrawer') {
    return <ProductsNavRowMobile {...shared} />;
  }
  return <ProductsNavRowDesktop {...shared} />;
}
