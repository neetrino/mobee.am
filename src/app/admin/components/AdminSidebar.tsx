'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminMenuDrawer } from '../../../components/AdminMenuDrawer';
import { getAdminMenuTABS } from '../admin-menu.config';
import { getStoredLanguage, setStoredLanguage, type LanguageCode } from '../../../lib/language';

interface AdminSidebarProps {
  currentPath: string;
  router: ReturnType<typeof useRouter>;
  t: ReturnType<typeof import('../../../lib/i18n-client').useTranslation>['t'];
}

export function AdminSidebar({ currentPath, router, t }: AdminSidebarProps) {
  const languageTabs: Array<{ code: LanguageCode; label: string }> = [
    { code: 'hy', label: 'hy' },
    { code: 'en', label: 'eng' },
    { code: 'ru', label: 'ru' },
  ];
  const adminTabs = getAdminMenuTABS(t);
  const homeTab = adminTabs.find((tab) => tab.id === 'home');
  const primaryTabs = adminTabs.filter((tab) => tab.id !== 'home');
  const productSubmenuIds = new Set(['categories', 'brands', 'attributes']);
  const productGroupPaths = ['/supersudo/products', '/supersudo/categories', '/supersudo/brands', '/supersudo/attributes'];
  const isProductGroupActive = productGroupPaths.some((path) => currentPath.startsWith(path));
  const [isProductsExpanded, setIsProductsExpanded] = useState(isProductGroupActive);
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>('en');

  useEffect(() => {
    if (isProductGroupActive) {
      setIsProductsExpanded(true);
    }
  }, [isProductGroupActive]);

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

  return (
    <>
      <div className="lg:hidden mb-6">
        <AdminMenuDrawer tabs={adminTabs} currentPath={currentPath} />
      </div>
      <aside className="hidden lg:block lg:w-64 flex-shrink-0 lg:sticky lg:top-0 lg:h-screen">
        <nav className="h-full bg-white border border-gray-200 rounded-lg p-2 flex flex-col overflow-hidden">
          <div className="px-4 py-3 text-sm font-semibold text-gray-900 border-b border-gray-200">
            Admin page
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-1">
            {primaryTabs.map((tab) => {
            if (tab.isSubCategory && !isProductsExpanded) {
              return null;
            }

            const isRootTab = tab.path === '/';
            const isActive = isRootTab
              ? currentPath === '/'
              : currentPath === tab.path ||
                (tab.path === '/supersudo' && currentPath === '/supersudo') ||
                (tab.path !== '/supersudo' && currentPath.startsWith(tab.path)) ||
                (tab.id === 'products' && isProductGroupActive);

            if (tab.id === 'products') {
              return (
                <div key={tab.id} className="w-full flex items-center gap-2">
                  <button
                    onClick={() => {
                      router.push(tab.path);
                    }}
                    className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-admin text-white'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <span className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-500'}`}>
                      {tab.icon}
                    </span>
                    <span className="text-left">{tab.label}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsProductsExpanded((prev) => !prev)}
                    aria-label={isProductsExpanded ? 'Collapse products menu' : 'Expand products menu'}
                    className={`h-10 w-10 flex items-center justify-center rounded-md transition-all ${
                      isActive ? 'text-white' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <svg
                      className={`w-4 h-4 transition-transform ${isProductsExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              );
            }

            if (tab.isSubCategory && !productSubmenuIds.has(tab.id)) {
              return null;
            }

            return (
              <button
                key={tab.id}
                onClick={() => {
                  router.push(tab.path);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-all ${
                  tab.isSubCategory ? 'pl-12' : ''
                } ${
                  isActive
                    ? 'bg-admin text-white'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-500'}`}>
                  {tab.icon}
                </span>
                <span className="text-left">{tab.label}</span>
              </button>
            );
            })}
          </div>
          {homeTab ? (
            <div className="mt-auto shrink-0 pt-3 border-t border-gray-200 space-y-2 bg-white">
              <button
                onClick={() => {
                  router.push(homeTab.path);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-all ${
                  currentPath === '/'
                    ? 'bg-admin text-white'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span className={`flex-shrink-0 ${currentPath === '/' ? 'text-white' : 'text-gray-500'}`}>
                  {homeTab.icon}
                </span>
                <span className="text-left">{homeTab.label}</span>
              </button>
              <div className="grid grid-cols-3 gap-1">
                {languageTabs.map((language) => {
                  const isActive = currentLanguage === language.code;
                  return (
                    <button
                      key={language.code}
                      type="button"
                      onClick={() => {
                        if (!isActive) {
                          setStoredLanguage(language.code);
                        }
                      }}
                      className={`w-full px-2 py-1.5 rounded-md text-xs font-semibold text-center uppercase tracking-wide transition-all border ${
                        isActive
                          ? 'bg-admin text-white border-admin'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      {language.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </nav>
      </aside>
    </>
  );
}
