'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useState } from 'react';
import type { AdminMenuItem } from '../../../components/AdminMenuDrawer';
import { getAdminMenuTABS } from '../admin-menu.config';
import { getStoredLanguage, setStoredLanguage, type LanguageCode } from '../../../lib/language';

const PRODUCT_SUBMENU_IDS = new Set(['categories', 'brands', 'attributes']);
const PRODUCT_GROUP_PATHS = [
  '/supersudo/products',
  '/supersudo/categories',
  '/supersudo/brands',
  '/supersudo/attributes',
] as const;

const LANGUAGE_TABS: Array<{ code: LanguageCode; label: string }> = [
  { code: 'hy', label: 'hy' },
  { code: 'en', label: 'eng' },
  { code: 'ru', label: 'ru' },
];

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
  onToggleExpand: () => void;
  onGoToProducts: () => void;
  expandAria: string;
  collapseAria: string;
}

function ProductsNavRow({
  tab,
  isActive,
  isExpanded,
  onToggleExpand,
  onGoToProducts,
  expandAria,
  collapseAria,
}: ProductsNavRowProps) {
  return (
    <div className="flex w-full items-center gap-2">
      <button
        type="button"
        onClick={onGoToProducts}
        className={`flex flex-1 items-center gap-3 rounded-md px-4 py-3 text-left text-sm font-medium transition-all ${
          isActive ? 'bg-admin text-white' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
        }`}
      >
        <span className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-500'}`}>{tab.icon}</span>
        <span>{tab.label}</span>
      </button>
      <button
        type="button"
        onClick={onToggleExpand}
        aria-label={isExpanded ? collapseAria : expandAria}
        className={`flex h-10 w-10 items-center justify-center rounded-md transition-all ${
          isActive ? 'text-white' : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <svg
          className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
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
      className={`flex w-full items-center gap-3 rounded-md px-4 py-3 text-left text-sm font-medium transition-all ${
        tab.isSubCategory ? 'pl-12' : ''
      } ${isActive ? 'bg-admin text-white' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
    >
      <span className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-500'}`}>{tab.icon}</span>
      <span>{tab.label}</span>
    </button>
  );
}

interface HomeAndLanguageFooterProps {
  homeTab: AdminMenuItem;
  currentPath: string;
  currentLanguage: LanguageCode;
  onGoHome: () => void;
}

function HomeAndLanguageFooter({ homeTab, currentPath, currentLanguage, onGoHome }: HomeAndLanguageFooterProps) {
  return (
    <div className="mt-auto shrink-0 space-y-2 border-t border-gray-200 bg-white pt-3">
      <button
        type="button"
        onClick={onGoHome}
        className={`flex w-full items-center gap-3 rounded-md px-4 py-3 text-left text-sm font-medium transition-all ${
          currentPath === '/' ? 'bg-admin text-white' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
        }`}
      >
        <span className={`flex-shrink-0 ${currentPath === '/' ? 'text-white' : 'text-gray-500'}`}>{homeTab.icon}</span>
        <span>{homeTab.label}</span>
      </button>
      <div className="grid grid-cols-3 gap-1">
        {LANGUAGE_TABS.map((language) => {
          const isLangActive = currentLanguage === language.code;
          return (
            <button
              key={language.code}
              type="button"
              onClick={() => {
                if (!isLangActive) {
                  setStoredLanguage(language.code);
                }
              }}
              className={`w-full rounded-md border px-2 py-1.5 text-center text-xs font-semibold uppercase tracking-wide transition-all ${
                isLangActive
                  ? 'border-admin bg-admin text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {language.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function useSidebarNavLanguage(): LanguageCode {
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>('en');

  useEffect(() => {
    setCurrentLanguage(getStoredLanguage());
    const handleLanguageUpdate = () => {
      setCurrentLanguage(getStoredLanguage());
    };
    window.addEventListener('language-updated', handleLanguageUpdate);
    return () => {
      window.removeEventListener('language-updated', handleLanguageUpdate);
    };
  }, []);

  return currentLanguage;
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
        onToggleExpand={() => {
          setIsProductsExpanded((prev) => !prev);
        }}
        onGoToProducts={() => {
          goTo(tab.path);
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
 * Shared admin sidebar navigation: primary items, expandable products group,
 * home + language switcher — same behavior in desktop aside and mobile drawer.
 */
export function AdminSidebarNavBody({
  currentPath,
  router,
  t,
  onAfterNavigate,
}: AdminSidebarNavBodyProps) {
  const adminTabs = getAdminMenuTABS(t);
  const homeTab = adminTabs.find((tab) => tab.id === 'home');
  const primaryTabs = adminTabs.filter((tab) => tab.id !== 'home');
  const productGroupActive = isProductGroupPathActive(currentPath);
  const [isProductsExpanded, setIsProductsExpanded] = useState(productGroupActive);
  const currentLanguage = useSidebarNavLanguage();

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
    <>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
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
      {homeTab ? (
        <HomeAndLanguageFooter
          homeTab={homeTab}
          currentPath={currentPath}
          currentLanguage={currentLanguage}
          onGoHome={() => {
            goTo(homeTab.path);
          }}
        />
      ) : null}
    </>
  );
}
